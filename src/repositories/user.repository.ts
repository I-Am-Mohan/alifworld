/**
 * AlifWorld User Account & Identity Repository
 * 
 * Manages user accounts, RBAC role assignments, multi-wallet initialization,
 * and transactional customer onboarding.
 * 
 * Invariants: ADR-0022, ADR-0028, ADR-0029, ADR-0031, ADR-0032
 */

import { getPrismaClient } from '@/shared/database/prisma';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { hashToken } from '@/shared/auth/jwt';

export interface CreateCustomerParams {
  email: string;
  phone?: string | null;
  name: string;
  passwordHash: string;
  locale?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class UserRepository {
  private get prisma() {
    return getPrismaClient() as any;
  }

  /**
   * Finds user by unique email address.
   */
  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        roleAssignments: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Finds user by unique phone number.
   */
  async findUserByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  /**
   * Finds user by email or phone identifier, including RBAC roles and permissions.
   */
  async findUserByIdentifier(identifier: string) {
    const clean = identifier.trim();
    const isEmail = clean.includes('@');

    let cleanEmail: string | undefined;
    let cleanPhone: string | undefined;
    let altPhone: string | undefined;

    if (isEmail) {
      cleanEmail = clean.toLowerCase();
    } else {
      const digits = clean.replace(/[\s\-()]/g, '');
      if (digits.startsWith('+8801')) {
        cleanPhone = digits;
        altPhone = digits.replace('+88', '');
      } else if (digits.startsWith('8801')) {
        cleanPhone = `+${digits}`;
        altPhone = digits.replace('88', '');
      } else if (digits.startsWith('01')) {
        cleanPhone = `+88${digits}`;
        altPhone = digits;
      } else {
        cleanEmail = clean.toLowerCase();
        cleanPhone = clean;
      }
    }

    const orClauses: Array<{ email?: string; phone?: string }> = [];
    if (cleanEmail) orClauses.push({ email: cleanEmail });
    if (cleanPhone) orClauses.push({ phone: cleanPhone });
    if (altPhone && altPhone !== cleanPhone) orClauses.push({ phone: altPhone });

    return this.prisma.user.findFirst({
      where: {
        OR: orClauses,
      },
      include: {
        roleAssignments: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        ownedSellers: {
          select: { id: true, status: true },
        },
        sellerStaff: {
          select: { sellerId: true },
        },
      },
    });
  }

  /**
   * Updates last login timestamp for a user.
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Updates user password hash.
   */
  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Selects only the credential fields needed by password security flows.
   */
  async findPasswordUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        passwordHash: true,
        deletedAt: true,
      },
    });
  }

  async findPasswordUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        status: true,
        passwordHash: true,
        deletedAt: true,
      },
    });
  }

  /**
   * Finds user by primary ID with roles and permissions.
   */
  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        roleAssignments: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        wallets: true,
        pointAccount: true,
      },
    });
  }

  /**
   * Transactionally registers a new customer user:
   * 1. Creates User record with hashed password
   * 2. Binds the CUSTOMER role
   * 3. Provisions segregated wallets (MAIN, SHOPPING, GOOD_LUCK, CHARITY)
   * 4. Provisions dedicated PointAccount (0 available, 0 pending, 0 lifetime)
   * 5. Creates email verification OTP token
   * 6. Appends audit log and outbox event
   */
  async registerCustomer(params: CreateCustomerParams): Promise<{
    user: any;
    rawVerificationCode: string;
    otpTokenId: string;
  }> {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: params.email },
      select: { id: true },
    });

    if (existingEmail) {
      throw new ConflictError(`An account with email '${params.email}' already exists`);
    }

    if (params.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: params.phone },
        select: { id: true },
      });
      if (existingPhone) {
        throw new ConflictError(`An account with phone '${params.phone}' already exists`);
      }
    }

    const userId = generateId(ID_PREFIXES.USER);
    // 6-digit numeric verification code for email confirmation
    const rawVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = hashToken(rawVerificationCode);
    const otpTokenId = generateId(ID_PREFIXES.OTP);
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL

    const result = await this.prisma.$transaction(async (tx: any) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          id: userId,
          email: params.email,
          phone: params.phone ?? null,
          name: params.name,
          passwordHash: params.passwordHash,
          status: 'ACTIVE',
          isEmailVerified: false,
          isPhoneVerified: false,
          tokenVersion: 1,
        },
      });

      // 2. Find or create CUSTOMER role
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

      // 3. Assign CUSTOMER role
      await tx.userRoleAssignment.create({
        data: {
          id: generateId(ID_PREFIXES.ROLE_ASSIGNMENT),
          userId: user.id,
          roleId: customerRole.id,
        },
      });

      // 4. Provision Segregated Wallets (MAIN, SHOPPING, GOOD_LUCK, CHARITY)
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
            userId: user.id,
            type: wType,
            currency: 'BDT',
            availablePoisha: BigInt(0),
            pendingPoisha: BigInt(0),
            status: 'ACTIVE',
          },
        });
      }

      // 5. Provision Dedicated Point Account (Loyalty)
      await tx.pointAccount.create({
        data: {
          id: generateId(ID_PREFIXES.POINT_ACCOUNT),
          userId: user.id,
          availablePoints: 0,
          pendingPoints: 0,
          lifetimePoints: 0,
        },
      });

      // 6. Create Ephemeral Email Verification OTP Token
      await tx.otpToken.create({
        data: {
          id: otpTokenId,
          userId: user.id,
          identifier: params.email,
          purpose: 'EMAIL_VERIFICATION',
          tokenHash,
          attempts: 0,
          maxAttempts: 3,
          isUsed: false,
          expiresAt: otpExpiresAt,
        },
      });

      // 7. Security Audit Log
      await tx.auditLog.create({
        data: {
          id: generateId(ID_PREFIXES.AUDIT),
          actorId: user.id,
          actorRole: 'CUSTOMER',
          action: 'CUSTOMER_REGISTERED',
          resource: 'User',
          resourceId: user.id,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          metadata: {
            email: params.email,
            locale: params.locale ?? 'bn-BD',
          },
        },
      });

      // 8. Transactional Outbox Event for Asynchronous Notification
      await tx.outboxEvent.create({
        data: {
          id: generateId(ID_PREFIXES.OUTBOX),
          eventType: 'auth.customer_registered',
          payload: {
            userId: user.id,
            email: params.email,
            name: params.name,
            locale: params.locale ?? 'bn-BD',
            verificationCode: rawVerificationCode,
            expiresAt: otpExpiresAt.toISOString(),
          },
          status: 'PENDING',
        },
      });

      return user;
    });

    return {
      user: result,
      rawVerificationCode,
      otpTokenId,
    };
  }
}
