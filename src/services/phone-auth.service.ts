/**
 * AlifWorld Phone-First OTP Authentication & Registration Service
 * 
 * Supports the mobile-first customer authentication and onboarding flows:
 * 1. Login: Phone Number -> OTP verification -> Instant Session
 * 2. Unregistered Detection: Phone Submit -> If not found, prompt to Register or Try Another
 * 3. Register: Phone Number -> OTP verification -> First/Last Name -> Password Setup -> Optional Details (Address, Birthday, Gender) -> Instant Session
 * 
 * Invariants: ADR-0022, ADR-0031, ADR-0033, ADR-0034
 */

import { UserRepository } from '@/repositories/user.repository';
import { OtpRepository } from '@/repositories/otp.repository';
import { AuthTokenService } from './auth-token.service';
import { getPrismaClient } from '@/shared/database/prisma';
import { hashToken } from '@/shared/auth/jwt';
import { hashPassword, validatePasswordStrength } from '@/shared/auth/password';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
} from '@/shared/errors/app-error';
import { ClientType } from '@/shared/auth/token-policy';
import {
  normalizeBangladeshPhone,
  getBangladeshMobileOperator,
  maskBangladeshPhone,
  BangladeshMobileOperator,
} from '@/shared/utils/phone';
import {
  validateBangladeshAddress,
} from '@/shared/geo/bangladesh-geo';

export const PHONE_AUTH_CONSTANTS = {
  LOGIN_PURPOSE: 'PHONE_LOGIN',
  REGISTER_PURPOSE: 'PHONE_REGISTRATION',
  COOLDOWN_SECONDS: 60,
  MAX_HOURLY_ATTEMPTS: 3,
  MAX_VERIFICATION_ATTEMPTS: 3,
  OTP_TTL_SECONDS: 10 * 60, // 10 minutes
};

export interface CheckUserResult {
  exists: boolean;
  registered: boolean;
  phone: string;
  maskedPhone: string;
  operator?: BangladeshMobileOperator | null;
  name?: string | null;
  status?: string;
  isEmailVerified?: boolean;
}

export interface SendOtpResult {
  success: boolean;
  phone: string;
  maskedPhone: string;
  operator?: BangladeshMobileOperator | null;
  message: string;
  cooldownSeconds: number;
  devOtpCode?: string;
}

export interface VerifyOtpResult {
  verified: boolean;
  phone: string;
  verificationTicket?: string;
  message: string;
  user?: any;
  tokens?: any;
  sessionId?: string;
  cookies?: any[];
}

export interface CompleteRegistrationParams {
  phone: string;
  verificationTicket?: string;
  firstName: string;
  lastName: string;
  password: string;
  email?: string | null;
  address?: string | null;
  division?: string | null;
  district?: string | null;
  upazila?: string | null;
  postalCode?: string | null;
  city?: string | null;
  birthday?: string | null;
  gender?: string | null;
  clientType?: ClientType;
  meta?: { ipAddress?: string | null; userAgent?: string | null };
}

export class PhoneAuthService {
  private userRepo: UserRepository;
  private otpRepo: OtpRepository;
  private tokenService: AuthTokenService;
  private prismaClient?: any;

  constructor(
    userRepo?: UserRepository,
    otpRepo?: OtpRepository,
    tokenService?: AuthTokenService,
    prisma?: any
  ) {
    this.userRepo = userRepo || new UserRepository();
    this.otpRepo = otpRepo || new OtpRepository();
    this.tokenService = tokenService || new AuthTokenService();
    this.prismaClient = prisma;
  }

  private get prisma() {
    return this.prismaClient || (getPrismaClient() as any);
  }

  /**
   * Normalizes a Bangladesh mobile number to standard E.164 (+8801XXXXXXXXX).
   * Supports Bengali numerals, strips formatting characters, and validates operator prefixes.
   */
  normalizePhoneNumber(raw: string): string {
    return normalizeBangladeshPhone(raw);
  }

  /**
   * Checks whether a user account exists with the given mobile number.
   */
  async checkUser(rawPhone: string): Promise<CheckUserResult> {
    const phone = this.normalizePhoneNumber(rawPhone);
    const maskedPhone = maskBangladeshPhone(phone);
    const operator = getBangladeshMobileOperator(phone);
    const user = await this.userRepo.findUserByPhone(phone);

    if (!user) {
      return { exists: false, registered: false, phone, maskedPhone, operator };
    }

    return {
      exists: true,
      registered: true,
      phone,
      maskedPhone,
      operator,
      name: user.name,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
    };
  }

  /**
   * Sends an OTP for Phone Login.
   */
  async sendLoginOtp(rawPhone: string): Promise<SendOtpResult> {
    const phone = this.normalizePhoneNumber(rawPhone);
    const user = await this.userRepo.findUserByPhone(phone);

    if (!user) {
      throw new NotFoundError(
        'No account found with this mobile number. Please register first.',
        { phone }
      );
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedError(
        'Your account has been suspended. Please contact customer support.'
      );
    }

    // 1. Enforce 60-second cooldown
    const latestOtp = await this.otpRepo.getLatestOtp(phone, PHONE_AUTH_CONSTANTS.LOGIN_PURPOSE);
    if (latestOtp) {
      const elapsedSeconds = Math.floor(
        (Date.now() - new Date(latestOtp.createdAt).getTime()) / 1000
      );
      if (elapsedSeconds < PHONE_AUTH_CONSTANTS.COOLDOWN_SECONDS) {
        const remaining = PHONE_AUTH_CONSTANTS.COOLDOWN_SECONDS - elapsedSeconds;
        throw new ValidationError(
          `Please wait ${remaining} second(s) before requesting another code.`,
          { cooldownRemainingSeconds: remaining }
        );
      }
    }

    // 2. Enforce max 3 per hour
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    const hourlyCount = await this.otpRepo.getRecentOtpCount(
      phone,
      PHONE_AUTH_CONSTANTS.LOGIN_PURPOSE,
      oneHourAgo
    );
    if (hourlyCount >= PHONE_AUTH_CONSTANTS.MAX_HOURLY_ATTEMPTS) {
      throw new ValidationError(
        'Maximum login OTP requests reached for this hour (3 attempts). Please try again later.'
      );
    }

    // 3. Invalidate previous active tokens
    await this.otpRepo.invalidateActiveOtps(phone, PHONE_AUTH_CONSTANTS.LOGIN_PURPOSE);

    // 4. Generate 6-digit numeric OTP code
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = hashToken(rawOtp);
    const expiresAt = new Date(Date.now() + PHONE_AUTH_CONSTANTS.OTP_TTL_SECONDS * 1000);

    await this.prisma.$transaction(async (tx: any) => {
      await tx.otpToken.create({
        data: {
          id: generateId(ID_PREFIXES.OTP),
          userId: user.id,
          identifier: phone,
          purpose: PHONE_AUTH_CONSTANTS.LOGIN_PURPOSE,
          tokenHash,
          attempts: 0,
          maxAttempts: PHONE_AUTH_CONSTANTS.MAX_VERIFICATION_ATTEMPTS,
          isUsed: false,
          expiresAt,
        },
      });

      await tx.outboxEvent.create({
        data: {
          id: generateId(ID_PREFIXES.OUTBOX),
          eventType: 'auth.phone_login_otp_dispatched',
          aggregateType: 'User',
          aggregateId: user.id,
          payload: {
            userId: user.id,
            phone,
            otpCode: rawOtp,
            expiresAt: expiresAt.toISOString(),
          },
          status: 'PENDING',
        },
      });
    });

    const isDev = process.env.NODE_ENV !== 'production';
    const maskedPhone = maskBangladeshPhone(phone);
    const operator = getBangladeshMobileOperator(phone);

    return {
      success: true,
      phone,
      maskedPhone,
      operator,
      message: `A 6-digit verification code has been sent to ${phone}.`,
      cooldownSeconds: PHONE_AUTH_CONSTANTS.COOLDOWN_SECONDS,
      ...(isDev && { devOtpCode: rawOtp }),
    };
  }

  /**
   * Verifies the OTP and immediately logs the user in.
   */
  async verifyLoginOtp(
    rawPhone: string,
    code: string,
    clientType: ClientType = 'WEB',
    meta?: { ipAddress?: string | null; userAgent?: string | null }
  ): Promise<VerifyOtpResult> {
    const phone = this.normalizePhoneNumber(rawPhone);
    const cleanCode = code.trim();

    const user = await this.userRepo.findUserByPhone(phone);
    if (!user) {
      throw new NotFoundError('No account found with this mobile number.');
    }

    const activeOtp = await this.otpRepo.findActiveOtp(phone, PHONE_AUTH_CONSTANTS.LOGIN_PURPOSE);
    if (!activeOtp) {
      throw new ValidationError(
        'Verification code has expired or is invalid. Please request a new code.'
      );
    }

    if (activeOtp.attempts >= activeOtp.maxAttempts) {
      await this.otpRepo.markUsed(activeOtp.id);
      throw new ValidationError(
        'Too many failed attempts. This code has been invalidated. Please request a new code.'
      );
    }

    const inputHash = hashToken(cleanCode);
    if (inputHash !== activeOtp.tokenHash) {
      const { attempts, maxAttempts } = await this.otpRepo.incrementAttempts(activeOtp.id);
      const remaining = Math.max(0, maxAttempts - attempts);

      if (remaining === 0) {
        await this.otpRepo.markUsed(activeOtp.id);
        throw new ValidationError(
          'Incorrect verification code. Maximum attempts reached. Please request a new code.'
        );
      }

      throw new ValidationError(
        `Incorrect verification code. You have ${remaining} attempt(s) remaining.`,
        { remainingAttempts: remaining }
      );
    }

    // Code is valid! Consume OTP and mark phone verified
    await this.prisma.$transaction(async (tx: any) => {
      await tx.otpToken.update({
        where: { id: activeOtp.id },
        data: { isUsed: true },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          isPhoneVerified: true,
          lastLoginAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          id: generateId(ID_PREFIXES.AUDIT),
          actorId: user.id,
          actorRole: 'CUSTOMER',
          action: 'USER_LOGIN',
          resource: 'User',
          resourceId: user.id,
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
          metadata: {
            authMethod: 'PHONE_OTP',
            phone,
          },
        },
      });
    });

    // Issue tokens
    const sellerId =
      user.ownedSellers?.[0]?.id ||
      user.sellerStaff?.[0]?.sellerId ||
      user.roleAssignments?.find((ra: any) => ra.sellerId)?.sellerId ||
      null;

    const tokenResult = await this.tokenService.issueTokenPair({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        status: user.status,
        tokenVersion: user.tokenVersion,
        roleAssignments: user.roleAssignments,
        sellerId,
      },
      clientType,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      verified: true,
      phone,
      message: 'Login successful! Welcome back to AlifWorld.',
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        status: user.status,
        isPhoneVerified: true,
        isEmailVerified: user.isEmailVerified,
        roles: tokenResult.user.roles,
        permissions: tokenResult.user.permissions,
        sellerId: tokenResult.user.sellerId,
      },
      tokens: {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        tokenType: 'Bearer',
        expiresIn: tokenResult.expiresIn,
        refreshExpiresIn: tokenResult.refreshExpiresIn,
      },
      sessionId: tokenResult.sessionId,
      cookies: tokenResult.cookies,
    };
  }

  /**
   * Sends an OTP for Registration.
   */
  async sendRegisterOtp(rawPhone: string): Promise<SendOtpResult> {
    const phone = this.normalizePhoneNumber(rawPhone);
    const existing = await this.userRepo.findUserByPhone(phone);

    if (existing) {
      throw new ConflictError(
        'An account with this mobile number already exists. Please sign in instead.',
        { phone }
      );
    }

    // 1. Cooldown check
    const latestOtp = await this.otpRepo.getLatestOtp(
      phone,
      PHONE_AUTH_CONSTANTS.REGISTER_PURPOSE
    );
    if (latestOtp) {
      const elapsedSeconds = Math.floor(
        (Date.now() - new Date(latestOtp.createdAt).getTime()) / 1000
      );
      if (elapsedSeconds < PHONE_AUTH_CONSTANTS.COOLDOWN_SECONDS) {
        const remaining = PHONE_AUTH_CONSTANTS.COOLDOWN_SECONDS - elapsedSeconds;
        throw new ValidationError(
          `Please wait ${remaining} second(s) before requesting another code.`,
          { cooldownRemainingSeconds: remaining }
        );
      }
    }

    // 2. Hourly rate limit
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    const hourlyCount = await this.otpRepo.getRecentOtpCount(
      phone,
      PHONE_AUTH_CONSTANTS.REGISTER_PURPOSE,
      oneHourAgo
    );
    if (hourlyCount >= PHONE_AUTH_CONSTANTS.MAX_HOURLY_ATTEMPTS) {
      throw new ValidationError(
        'Maximum registration OTP requests reached for this hour (3 attempts). Please try again later.'
      );
    }

    // 3. Invalidate old active registration OTPs
    await this.otpRepo.invalidateActiveOtps(phone, PHONE_AUTH_CONSTANTS.REGISTER_PURPOSE);

    // 4. Generate 6-digit OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = hashToken(rawOtp);
    const expiresAt = new Date(Date.now() + PHONE_AUTH_CONSTANTS.OTP_TTL_SECONDS * 1000);

    await this.prisma.$transaction(async (tx: any) => {
      await tx.otpToken.create({
        data: {
          id: generateId(ID_PREFIXES.OTP),
          identifier: phone,
          purpose: PHONE_AUTH_CONSTANTS.REGISTER_PURPOSE,
          tokenHash,
          attempts: 0,
          maxAttempts: PHONE_AUTH_CONSTANTS.MAX_VERIFICATION_ATTEMPTS,
          isUsed: false,
          expiresAt,
        },
      });

      await tx.outboxEvent.create({
        data: {
          id: generateId(ID_PREFIXES.OUTBOX),
          eventType: 'auth.phone_registration_otp_dispatched',
          aggregateType: 'PhoneOTP',
          aggregateId: phone,
          payload: {
            phone,
            otpCode: rawOtp,
            expiresAt: expiresAt.toISOString(),
          },
          status: 'PENDING',
        },
      });
    });

    const isDev = process.env.NODE_ENV !== 'production';
    const maskedPhone = maskBangladeshPhone(phone);
    const operator = getBangladeshMobileOperator(phone);

    return {
      success: true,
      phone,
      maskedPhone,
      operator,
      message: `A 6-digit registration code has been sent to ${phone}.`,
      cooldownSeconds: PHONE_AUTH_CONSTANTS.COOLDOWN_SECONDS,
      ...(isDev && { devOtpCode: rawOtp }),
    };
  }

  /**
   * Verifies the Registration OTP and returns a verification ticket for completing registration.
   */
  async verifyRegisterOtp(rawPhone: string, code: string): Promise<VerifyOtpResult> {
    const phone = this.normalizePhoneNumber(rawPhone);
    const cleanCode = code.trim();

    const activeOtp = await this.otpRepo.findActiveOtp(
      phone,
      PHONE_AUTH_CONSTANTS.REGISTER_PURPOSE
    );
    if (!activeOtp) {
      throw new ValidationError(
        'Verification code has expired or is invalid. Please request a new code.'
      );
    }

    if (activeOtp.attempts >= activeOtp.maxAttempts) {
      await this.otpRepo.markUsed(activeOtp.id);
      throw new ValidationError(
        'Too many failed attempts. This code has been invalidated. Please request a new code.'
      );
    }

    const inputHash = hashToken(cleanCode);
    if (inputHash !== activeOtp.tokenHash) {
      const { attempts, maxAttempts } = await this.otpRepo.incrementAttempts(activeOtp.id);
      const remaining = Math.max(0, maxAttempts - attempts);

      if (remaining === 0) {
        await this.otpRepo.markUsed(activeOtp.id);
        throw new ValidationError(
          'Incorrect verification code. Maximum attempts reached. Please request a new code.'
        );
      }

      throw new ValidationError(
        `Incorrect verification code. You have ${remaining} attempt(s) remaining.`,
        { remainingAttempts: remaining }
      );
    }

    // Mark OTP used
    await this.otpRepo.markUsed(activeOtp.id);

    // Create a verification ticket
    const verificationTicket = hashToken(`${phone}:${activeOtp.id}:${Date.now()}`);

    return {
      verified: true,
      phone,
      verificationTicket,
      message: 'Mobile number verified successfully. Please complete your registration details.',
    };
  }

  /**
   * Completes registration after OTP verification:
   * Saves First/Last Name, Password, and Optional Details (Address, Birthday, Gender).
   * Provisions 4 Segregated Wallets and PointAccount, then automatically logs the user in.
   */
  async completeRegistration(params: CompleteRegistrationParams) {
    const phone = this.normalizePhoneNumber(params.phone);

    // 1. Ensure phone not already registered
    const existing = await this.userRepo.findUserByPhone(phone);
    if (existing) {
      throw new ConflictError('An account with this mobile number already exists.');
    }

    // 2. Validate password strength
    const passwordCheck = validatePasswordStrength(params.password);
    if (!passwordCheck.isValid) {
      throw new ValidationError(
        `Password does not meet required security standards: ${passwordCheck.errors.join('; ')}`,
        { errors: passwordCheck.errors }
      );
    }

    // 2.1 Validate optional address details if provided
    if (params.division || params.district || params.postalCode) {
      const geoCheck = validateBangladeshAddress({
        division: params.division || undefined,
        district: params.district || undefined,
        upazila: params.upazila || undefined,
        postalCode: params.postalCode || undefined,
        streetAddress: params.address || undefined,
      });
      if (!geoCheck.isValid) {
        throw new ValidationError(
          `Invalid address details: ${geoCheck.errors.join('; ')}`,
          { errors: geoCheck.errors }
        );
      }
    }

    const passwordHash = hashPassword(params.password);
    const fullName = `${params.firstName.trim()} ${params.lastName.trim()}`.trim();
    const userId = generateId(ID_PREFIXES.USER);
    const clientType = params.clientType || 'WEB';

    // 3. Atomic Database Provisioning
    const user = await this.prisma.$transaction(async (tx: any) => {
      // 3.1 Create User
      const newUser = await tx.user.create({
        data: {
          id: userId,
          phone,
          email: params.email ? params.email.trim().toLowerCase() : null,
          name: fullName,
          passwordHash,
          status: 'ACTIVE',
          isPhoneVerified: true,
          isEmailVerified: false,
          tokenVersion: 1,
          lastLoginAt: new Date(),
        },
      });

      // 3.2 Ensure CUSTOMER role
      let customerRole = await tx.role.findUnique({
        where: { code: 'CUSTOMER' },
      });

      if (!customerRole) {
        customerRole = await tx.role.create({
          data: {
            id: generateId(ID_PREFIXES.ROLE),
            code: 'CUSTOMER',
            name: 'Customer',
            description: 'Marketplace buyer and rewards club participant',
            isSystem: true,
          },
        });
      }

      // 3.3 Assign Role
      await tx.userRoleAssignment.create({
        data: {
          id: generateId(ID_PREFIXES.ROLE_ASSIGNMENT),
          userId: newUser.id,
          roleId: customerRole.id,
        },
      });

      // 3.4 Provision Segregated Wallets (MAIN, SHOPPING, GOOD_LUCK, CHARITY)
      const walletTypes: Array<'MAIN' | 'SHOPPING' | 'GOOD_LUCK' | 'CHARITY'> = [
        'MAIN',
        'SHOPPING',
        'GOOD_LUCK',
        'CHARITY',
      ];

      for (const wType of walletTypes) {
        await tx.wallet.create({
          data: {
            id: generateId(ID_PREFIXES.WALLET),
            userId: newUser.id,
            type: wType,
            currency: 'BDT',
            availablePoisha: BigInt(0),
            pendingPoisha: BigInt(0),
            status: 'ACTIVE',
          },
        });
      }

      // 3.5 Provision Point Account
      await tx.pointAccount.create({
        data: {
          id: generateId(ID_PREFIXES.POINT_ACCOUNT),
          userId: newUser.id,
          availablePoints: 0,
          pendingPoints: 0,
          lifetimePoints: 0,
        },
      });

      // 3.6 Audit Log
      await tx.auditLog.create({
        data: {
          id: generateId(ID_PREFIXES.AUDIT),
          actorId: newUser.id,
          actorRole: 'CUSTOMER',
          action: 'CUSTOMER_REGISTERED',
          resource: 'User',
          resourceId: newUser.id,
          ipAddress: params.meta?.ipAddress ?? null,
          userAgent: params.meta?.userAgent ?? null,
          metadata: {
            registrationMethod: 'PHONE_OTP',
            phone,
            hasAddress: !!params.address,
            hasBirthday: !!params.birthday,
            hasGender: !!params.gender,
            division: params.division ?? null,
            district: params.district ?? null,
            upazila: params.upazila ?? null,
            postalCode: params.postalCode ?? null,
          },
        },
      });

      // 3.7 Outbox Event
      await tx.outboxEvent.create({
        data: {
          id: generateId(ID_PREFIXES.OUTBOX),
          eventType: 'auth.customer_registered',
          aggregateType: 'User',
          aggregateId: newUser.id,
          payload: {
            userId: newUser.id,
            phone,
            name: fullName,
            registrationMethod: 'PHONE_OTP',
            optionalProfile: {
              address: params.address ?? null,
              division: params.division ?? null,
              district: params.district ?? null,
              upazila: params.upazila ?? null,
              postalCode: params.postalCode ?? null,
              city: params.city ?? null,
              birthday: params.birthday ?? null,
              gender: params.gender ?? null,
            },
          },
          status: 'PENDING',
        },
      });

      return newUser;
    });

    // 4. Issue Session Tokens and Log In Immediately
    const tokenResult = await this.tokenService.issueTokenPair({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        status: user.status,
        tokenVersion: user.tokenVersion,
        roleAssignments: [
          {
            role: {
              code: 'CUSTOMER',
              rolePermissions: [],
            },
          },
        ],
        sellerId: null,
      },
      clientType,
      ipAddress: params.meta?.ipAddress,
      userAgent: params.meta?.userAgent,
    });

    return {
      success: true,
      message: 'Account created successfully! Welcome to AlifWorld.',
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        status: user.status,
        isPhoneVerified: true,
        isEmailVerified: false,
        roles: tokenResult.user.roles,
        permissions: tokenResult.user.permissions,
        sellerId: null,
      },
      tokens: {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        tokenType: 'Bearer',
        expiresIn: tokenResult.expiresIn,
        refreshExpiresIn: tokenResult.refreshExpiresIn,
      },
      sessionId: tokenResult.sessionId,
      cookies: tokenResult.cookies,
    };
  }
}
