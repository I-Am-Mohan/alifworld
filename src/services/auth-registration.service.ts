/**
 * AlifWorld Customer Registration Service
 * 
 * Coordinates customer signup, password strength validation, cryptographic hashing,
 * atomic wallet & points initialization, and outbox notification dispatch.
 * 
 * Invariants: ADR-0003, ADR-0022, ADR-0029, ADR-0031, ADR-0032
 */

import { UserRepository } from '@/repositories/user.repository';
import { hashPassword, validatePasswordStrength } from '@/shared/auth/password';
import { ValidationError } from '@/shared/errors/app-error';
import { CustomerRegistrationInput } from '@/validators/auth.validator';
import { AuthTokenService } from './auth-token.service';

export interface RegistrationResult {
  userId: string;
  email: string;
  name: string;
  phone: string | null;
  status: string;
  isEmailVerified: boolean;
  message: string;
  // Included in development/testing mode for verification flow validation
  devVerificationCode?: string;
}

export class AuthRegistrationService {
  private userRepo: UserRepository;
  private tokenService: AuthTokenService;

  constructor(userRepo?: UserRepository, tokenService?: AuthTokenService) {
    this.userRepo = userRepo || new UserRepository();
    this.tokenService = tokenService || new AuthTokenService();
  }

  /**
   * Registers a new customer account with secure password hashing and multi-wallet initialization.
   */
  async registerCustomer(
    input: CustomerRegistrationInput,
    meta?: { ipAddress?: string | null; userAgent?: string | null }
  ): Promise<RegistrationResult> {
    // 1. Validate password complexity
    const passwordCheck = validatePasswordStrength(input.password);
    if (!passwordCheck.isValid) {
      throw new ValidationError(
        `Password does not meet required security standards: ${passwordCheck.errors.join('; ')}`,
        { errors: passwordCheck.errors }
      );
    }

    // 2. Hash password with PBKDF2-HMAC-SHA512
    const passwordHash = hashPassword(input.password);

    // 3. Register user and initialize wallets in atomic database transaction
    const { user, rawVerificationCode } = await this.userRepo.registerCustomer({
      email: input.email,
      phone: input.phone,
      name: input.name,
      passwordHash,
      locale: input.locale,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    const isDev = process.env.NODE_ENV !== 'production';

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      message: 'Account registered successfully. A 6-digit verification code has been sent to your email.',
      ...(isDev && { devVerificationCode: rawVerificationCode }),
    };
  }
}
