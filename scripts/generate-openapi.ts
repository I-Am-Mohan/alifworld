/**
 * AlifWorld OpenAPI 3.1 Specification Generator
 * Generates the authoritative REST API specification for mobile Flutter clients and third-party integrations.
 * Reference: docs/architecture/single-application-modular-monolith.md
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'AlifWorld Modular Monolith REST API',
    version: '1.0.0',
    description:
      'Authoritative REST API specification for the AlifWorld e-commerce platform and digital ecosystem. Serves storefront, seller portal, admin backoffice, and Flutter mobile applications with strict BDT/poisha financial precision and dual-language localization (bn-BD / en-BD).',
    contact: {
      name: 'AlifWorld Architecture & Engineering',
      email: 'engineering@alifworld.com',
      url: 'https://alifworld.com',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Development Server',
    },
    {
      url: 'https://staging.alifworld.com',
      description: 'Staging Integration Server',
    },
    {
      url: 'https://api.alifworld.com',
      description: 'Production Cluster',
    },
  ],
  tags: [
    { name: 'System Health', description: 'Kubernetes and load balancer liveness/readiness probes' },
    { name: 'Root API', description: 'Root discovery endpoints and API metadata' },
    { name: 'Authentication', description: 'Customer and seller session management' },
    { name: 'Catalog', description: 'Categories, brands, products, and inventory' },
    { name: 'Order', description: 'Shopping cart, checkout, and order snapshotting' },
    { name: 'Wallet & Ledger', description: 'Double-entry wallet accounting and transaction logs' },
    { name: 'Product Points', description: 'Independent loyalty and point snapshotting' },
    { name: 'Payments & Settlements', description: 'Customer payment gateways, webhooks, partial refunds, 5% platform commissions, settlements, and BEFTN payouts' },
    { name: 'Database & Migrations', description: 'Data dictionary discovery, zero-downtime migration status, and schema health' },
    { name: 'Internationalization & Localization', description: 'Dynamic language management, default locale settings, and multilingual platform support' },
    { name: 'Seller Portal', description: 'Storefront management, settings, staff delegation, and KYC compliance' },
    { name: 'Identity & Access Management', description: 'RBAC roles, granular permissions, and identity governance' },
    { name: 'Customer Support', description: 'Omnichannel customer assistance, order incident tickets, and live SLA resolution' },
    { name: 'Logistics & Delivery', description: 'Delivery rider dispatch, assignment lease claiming, and live GPS telemetry' },
    { name: 'Customer & Ownership', description: 'Customer self-service, profile anti-tampering, and object-level ownership checks' },
    { name: 'Audit & Compliance', description: 'Immutable security event auditing, business operation logs, and compliance exploration' },
  ],
  paths: {
    '/api/health/live': {
      get: {
        tags: ['System Health'],
        summary: 'Process Liveness Probe',
        description: 'Returns HTTP 200 if the Next.js process is active and accepting requests.',
        responses: {
          '200': {
            description: 'Process is alive',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'number', example: 120.45 },
                  },
                  required: ['status', 'timestamp', 'uptime'],
                },
              },
            },
          },
        },
      },
    },
    '/api/health/ready': {
      get: {
        tags: ['System Health'],
        summary: 'Dependency Readiness Probe',
        description: 'Returns HTTP 200 if database and cache dependencies are operational.',
        responses: {
          '200': {
            description: 'Dependencies operational',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    checks: {
                      type: 'object',
                      properties: {
                        database: { type: 'string', example: 'connected' },
                        redis: { type: 'string', example: 'connected' },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                  required: ['status', 'checks', 'timestamp'],
                },
              },
            },
          },
          '503': {
            description: 'One or more critical dependencies unavailable',
          },
        },
      },
    },
    '/api/v1': {
      get: {
        tags: ['Root API'],
        summary: 'API v1 Root Discovery',
        description: 'Returns platform metadata, supported currencies, minor units, and endpoints.',
        responses: {
          '200': {
            description: 'Metadata retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiSuccessEnvelope',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/openapi.json': {
      get: {
        tags: ['Root API'],
        summary: 'OpenAPI Schema Document',
        description: 'Returns the raw OpenAPI 3.1 schema JSON document.',
        responses: {
          '200': {
            description: 'OpenAPI schema JSON',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register Customer Account',
        description: 'Registers a new customer account, assigns CUSTOMER role, initializes 4 segregated wallets (MAIN, SHOPPING, GOOD_LUCK, CHARITY), and dispatches email verification OTP.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CustomerRegisterRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Customer registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CustomerRegisterResponse' },
              },
            },
          },
          '409': {
            description: 'Account with email or phone already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '422': {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/email/verify': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify Customer Email Address',
        description: 'Verifies a customer email address using a 6-digit ephemeral OTP token. Validates attempt limits (max 3), marks user email as verified, invalidates token, records audit log, and emits auth.email_verified outbox event.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VerifyEmailRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Email verified successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VerifyEmailResponse' },
              },
            },
          },
          '404': {
            description: 'User account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '422': {
            description: 'Verification code expired, invalid, or attempt lockout',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/email/resend': {
      post: {
        tags: ['Authentication'],
        summary: 'Resend Email Verification Code',
        description: 'Resends a fresh 6-digit verification code with 60-second cooldown enforcement and 3 requests/hour limit. Returns neutral response for unregistered emails to prevent enumeration.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResendVerificationRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Verification code resent successfully or neutral notice',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ResendVerificationResponse' },
              },
            },
          },
          '429': {
            description: 'Rate limit or cooldown exceeded (60s cooldown or max 3 per hour)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '422': {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/phone/check': {
      post: {
        tags: ['Authentication'],
        summary: 'Check Phone Registration Status',
        description: 'Verifies whether a Bangladesh mobile number is already registered in the system, directing client state to login OTP or guided onboarding registration.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PhoneCheckRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Phone check result returned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PhoneCheckResponse' },
              },
            },
          },
          '422': {
            description: 'Validation failed (invalid phone number)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/phone/send-otp': {
      post: {
        tags: ['Authentication'],
        summary: 'Send Phone Verification OTP',
        description: 'Dispatches a 6-digit ephemeral OTP to the specified Bangladesh mobile number with 60-second cooldown and hourly rate limits.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PhoneSendOtpRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'OTP dispatched successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PhoneSendOtpResponse' },
              },
            },
          },
          '422': {
            description: 'Invalid phone or purpose mismatch',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '429': {
            description: 'Cooldown or rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/phone/verify-login': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify Phone Login OTP & Issue Session',
        description: 'Verifies 6-digit login OTP for an existing phone user, issues access + rotating refresh tokens, and establishes HttpOnly session cookies.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PhoneVerifyLoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful, session established',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          '422': {
            description: 'Invalid, expired OTP or account lockout',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/phone/verify-register': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify Registration OTP & Issue Ticket',
        description: 'Verifies 6-digit OTP for an onboarding mobile number and issues a cryptographically signed HMAC registration ticket.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PhoneVerifyRegisterRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'OTP verified, registration ticket returned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PhoneVerifyRegisterResponse' },
              },
            },
          },
          '422': {
            description: 'Invalid or expired OTP',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/phone/complete-registration': {
      post: {
        tags: ['Authentication'],
        summary: 'Complete Phone Registration Wizard',
        description: 'Validates registration ticket, creates customer record, provisions 4 segregated wallets and point account, saves optional demographics, and establishes authenticated session.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PhoneCompleteRegistrationRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Registration completed and logged in',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          '422': {
            description: 'Invalid ticket, password policy mismatch, or validation failure',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User Authentication & Token Issuance',
        description: 'Authenticates a user via email or Bangladesh mobile number, issues short-lived JWT access token and single-use rotating refresh token. Sets HttpOnly cookies for web browsers and provides Bearer tokens for mobile Flutter clients.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful, tokens issued',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          '401': {
            description: 'Invalid credentials or account suspended',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '422': {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Rotate Refresh Token & Detect Family Reuse',
        description: 'Rotates a single-use refresh token within an authenticated token family. Issues fresh access token and next-generation refresh token. If a previously consumed token is presented, detects security breach, revokes the entire token family, and terminates active sessions.',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token rotated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RefreshTokenResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized, session expired, or token reuse detected',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '422': {
            description: 'Validation failed or refresh token missing',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Current Authenticated User Profile',
        description: 'Retrieves active user profile, assigned RBAC roles, granular permissions, segregated wallet balances, and decoupled loyalty points for the current session.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CurrentUserProfileResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized or token expired/revoked',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'User Logout & Session Revocation',
        description: 'Terminates active session in the database, records audit log, and clears HttpOnly authentication cookies.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LogoutResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/sessions': {
      get: {
        tags: ['Authentication'],
        summary: 'List Active User Sessions & Devices',
        description: 'Returns all active authenticated sessions and registered devices for the current user, flagging the current session.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of active sessions returned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SessionListResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized or session expired',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/sessions/{sessionId}': {
      delete: {
        tags: ['Authentication'],
        summary: 'Revoke Specific Session/Device',
        description: 'Revokes a single active session belonging to the authenticated user. If the session is the current one, clears cookies.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'sessionId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The unique ID of the session to terminate',
          },
        ],
        responses: {
          '200': {
            description: 'Session revoked successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RevokeSessionResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '404': {
            description: 'Session not found or belongs to another user',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/sessions/revoke-others': {
      post: {
        tags: ['Authentication'],
        summary: 'Revoke All Other Sessions',
        description: 'Revokes all active sessions for the current user except the current active session.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'All other sessions revoked successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RevokeOthersResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/sessions/revoke-all': {
      post: {
        tags: ['Authentication'],
        summary: 'Revoke All Sessions Globally',
        description: 'Terminates all active sessions for the user, increments tokenVersion to immediately invalidate all access tokens, clears cookies, and forces re-login.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'All sessions revoked globally',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RevokeAllResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/password/request-reset': {
      post: {
        tags: ['Authentication'],
        summary: 'Request Password Reset',
        description: 'Queues a one-time 15-minute password reset link. The response is deliberately neutral for known and unknown email addresses. Requests are limited to one per minute and three per hour per account.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PasswordResetRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Neutral reset-request acknowledgement',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PasswordResetRequestResponse' },
              },
            },
          },
          '422': {
            description: 'Invalid email or locale',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '503': {
            description: 'Reset notification could not be queued',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/password/reset': {
      post: {
        tags: ['Authentication'],
        summary: 'Reset Password with One-Time Token',
        description: 'Consumes a hashed one-time reset token, rejects compromised or reused passwords, updates the password, increments tokenVersion, and revokes every active session atomically.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PasswordResetCompletionRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password reset and all sessions revoked',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PasswordMutationResponse' },
              },
            },
          },
          '409': {
            description: 'The one-time token was consumed concurrently',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '422': {
            description: 'Invalid token or password policy failure',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/password/change': {
      post: {
        tags: ['Authentication'],
        summary: 'Change Authenticated User Password',
        description: 'Verifies the current password, rejects compromised or reused passwords, changes the credential, increments tokenVersion, and revokes every active session atomically.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PasswordChangeRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password changed and all sessions revoked',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PasswordMutationResponse' },
              },
            },
          },
          '401': {
            description: 'Authentication failed or current password is incorrect',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
          '422': {
            description: 'Password policy failure',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/token/policy': {
      get: {
        tags: ['Authentication'],
        summary: 'Authentication Token Policy Discovery',
        description: 'Returns authoritative token TTL configurations, cookie parameters, and password complexity requirements.',
        responses: {
          '200': {
            description: 'Token policy retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokenPolicyResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/csrf': {
      get: {
        tags: ['Authentication'],
        summary: 'Provision Anti-CSRF Token',
        description: 'Generates an authentic cryptographically signed anti-CSRF token, provisions the aw_csrf cookie, and returns token metadata for client mutation headers.',
        responses: {
          '200': {
            description: 'Anti-CSRF token provisioned successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        csrfToken: { type: 'string', example: '9a8b7c...1727050000000.f4e3d2...' },
                        headerName: { type: 'string', example: 'x-csrf-token' },
                        expiresInSeconds: { type: 'number', example: 86400 },
                      },
                      required: ['csrfToken', 'headerName', 'expiresInSeconds'],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/token/introspect': {
      post: {
        tags: ['Authentication'],
        summary: 'Introspect Access Token',
        description: 'RFC 7662 compliant token introspection verifying active state, tokenVersion, and session validity.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TokenIntrospectRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token introspection result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokenIntrospectResponse' },
              },
            },
          },
          '422': {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/oauth/google': {
      get: {
        tags: ['Authentication'],
        summary: 'Initiate Google OAuth Flow',
        description: 'Initiates Google OpenID Connect authorization code flow with HMAC anti-CSRF state token and HttpOnly nonce cookie.',
        parameters: [
          {
            name: 'returnUrl',
            in: 'query',
            description: 'Post-authentication redirection URL',
            schema: { type: 'string', default: '/' },
          },
          {
            name: 'clientType',
            in: 'query',
            description: 'Client platform type',
            schema: { type: 'string', enum: ['WEB', 'MOBILE_FLUTTER'], default: 'WEB' },
          },
        ],
        responses: {
          '302': {
            description: 'Redirects to Google accounts authorization page',
          },
        },
      },
    },
    '/api/v1/auth/oauth/google/callback': {
      get: {
        tags: ['Authentication'],
        summary: 'Handle Google OAuth Redirect Callback',
        description: 'Verifies state anti-CSRF cookie, exchanges code for Google tokens, links or registers customer account, initializes 4 segregated wallets, and sets session cookies.',
        parameters: [
          {
            name: 'code',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'state',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '302': {
            description: 'Redirects to returnUrl with session established in cookies',
          },
        },
      },
    },
    '/api/v1/auth/oauth/google/verify': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify Google ID Token (Flutter / Mobile)',
        description: 'Verifies native Google ID token from Flutter SDK, links or provisions customer account, and issues Bearer access and refresh token pair.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OAuthVerifyRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OAuthVerifyResponse' },
              },
            },
          },
          '401': {
            description: 'Invalid token credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/oauth/facebook': {
      get: {
        tags: ['Authentication'],
        summary: 'Initiate Facebook OAuth Flow',
        description: 'Initiates Facebook OAuth 2.0 authorization code flow with HMAC anti-CSRF state token.',
        parameters: [
          {
            name: 'returnUrl',
            in: 'query',
            description: 'Post-authentication redirection URL',
            schema: { type: 'string', default: '/' },
          },
        ],
        responses: {
          '302': {
            description: 'Redirects to Facebook OAuth dialog',
          },
        },
      },
    },
    '/api/v1/auth/oauth/facebook/callback': {
      get: {
        tags: ['Authentication'],
        summary: 'Handle Facebook OAuth Redirect Callback',
        description: 'Verifies state anti-CSRF token, exchanges code for Facebook access token, links or registers customer account, provisions wallets, and sets session cookies.',
        parameters: [
          {
            name: 'code',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'state',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '302': {
            description: 'Redirects to returnUrl with session established in cookies',
          },
        },
      },
    },
    '/api/v1/auth/oauth/facebook/verify': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify Facebook Access Token (Flutter / Mobile)',
        description: 'Verifies native Facebook access token from Flutter SDK, links or provisions customer account, and issues Bearer token pair.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OAuthVerifyRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OAuthVerifyResponse' },
              },
            },
          },
          '401': {
            description: 'Invalid token credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/customer/profile': {
      get: {
        tags: ['Customer & Ownership'],
        summary: 'Get Customer Profile',
        description: 'Retrieves the authenticated customer\'s own profile. Strictly enforces self-ownership against unauthorized snooping.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Customer profile retrieved',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Forbidden: Ownership violation' },
        },
      },
      put: {
        tags: ['Customer & Ownership'],
        summary: 'Update Customer Profile',
        description: 'Updates customer profile fields. Strictly prevents modifying internal security fields (status, roles, walletBalance) via privilege escalation barriers.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Rahim Khan' },
                  avatarUrl: { type: 'string', example: 'https://cdn.alifworld.com/avatars/usr_1.jpg' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Profile updated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Forbidden: Privilege escalation or ownership violation' },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/cart': {
      get: {
        tags: ['Customer & Ownership'],
        summary: 'Get Active Shopping Cart',
        description: 'Retrieves the authenticated customer\'s own shopping cart, enforcing strict self-ownership.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Shopping cart retrieved',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
        },
      },
    },
    '/api/v1/cart/checkout': {
      post: {
        tags: ['Customer & Ownership'],
        summary: 'Checkout Cart with Ownership Check',
        description: 'Executes checkout for the customer\'s owned cart. Prevents checking out carts belonging to another user.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  cartId: { type: 'string', example: 'crt_12345' },
                  checkout: { type: 'object' },
                },
                required: ['cartId', 'checkout'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Order created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Forbidden: Cart ownership violation' },
        },
      },
    },
    '/api/v1/orders': {
      get: {
        tags: ['Order'],
        summary: 'List Scoped Orders',
        description: 'Returns orders scoped to caller: customers view their own orders; merchants view their fulfillment groups; admins view all orders.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Scoped orders list',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication required' },
        },
      },
      post: {
        tags: ['Order'],
        summary: 'Create Customer Order (Checkout)',
        description: 'Executes checkout from an active cart, partitioning items into seller fulfillment groups with exact poisha pricing and independent Product Points snapshotting.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  cartId: { type: 'string', example: 'crt_1j7x4b9e8m02k3f8d7c6b5a4' },
                  shippingName: { type: 'string', example: 'Tanvir Ahmed' },
                  shippingPhone: { type: 'string', example: '+8801700112233' },
                  shippingDivision: { type: 'string', enum: ['DHAKA', 'CHITTAGONG', 'RAJSHAHI', 'KHULNA', 'BARISAL', 'SYLHET', 'RANGPUR', 'MYMENSINGH'] },
                  shippingDistrict: { type: 'string', example: 'Dhaka' },
                  shippingAddress: { type: 'string', example: 'House 42, Road 11, Gulshan-2' },
                },
                required: ['cartId', 'shippingName', 'shippingPhone', 'shippingDivision', 'shippingDistrict', 'shippingAddress'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Order created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/orders/{orderNumber}': {
      get: {
        tags: ['Order'],
        summary: 'Get Order Details & Shipment Tracking',
        description: 'Returns complete customer parent order details with seller fulfillment groups, courier tracking numbers, and shipment timelines.',
        parameters: [
          {
            name: 'orderNumber',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'ORD-20260922-0001' },
          },
        ],
        responses: {
          '200': {
            description: 'Order details and shipment tracking retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/orders/{id}': {
      get: {
        tags: ['Order', 'Customer & Ownership'],
        summary: 'Get Order by ID with Object-Level Authorization',
        description: 'Returns order details if caller is the owning customer, fulfilling merchant, assigned rider, or platform administrator.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'ord_12345' },
          },
        ],
        responses: {
          '200': {
            description: 'Order details retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Forbidden: Ownership or tenant violation' },
          '404': { description: 'Order not found' },
        },
      },
    },
    '/api/v1/orders/{id}/cancel': {
      post: {
        tags: ['Order', 'Customer & Ownership'],
        summary: 'Cancel Order (Self-Service Ownership & Status Invariant)',
        description: 'Allows a customer to cancel their own order only while in eligible pending states (PENDING, PLACED, PAYMENT_PENDING).',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'ord_12345' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: { type: 'string', example: 'Accidentally placed duplicate order' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Order cancelled successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
          '401': { description: 'Authentication required' },
          '403': { description: 'Forbidden: Ownership violation or non-cancellable status' },
          '404': { description: 'Order not found' },
        },
      },
    },
    '/api/v1/seller/orders': {
      get: {
        tags: ['Order'],
        summary: 'List Seller Fulfillment Groups',
        description: 'Multi-tenant scoped query returning fulfillment groups and packing items exclusively belonging to the authenticated merchant.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of seller fulfillment groups',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/seller/orders/{groupId}/status': {
      patch: {
        tags: ['Order'],
        summary: 'Transition Fulfillment Group Status',
        description: 'Advances fulfillment group along state machine (ACCEPTED, PACKING, READY_FOR_PICKUP, HANDED_OVER_TO_COURIER) with strict tenant verification.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'groupId',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'sfg_1j7x4b9e8m02k3f8d7c6b5a4' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['ACCEPTED', 'PACKING', 'READY_FOR_PICKUP', 'HANDED_OVER_TO_COURIER'] },
                  reason: { type: 'string' },
                },
                required: ['status'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Status advanced successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/payments': {
      post: {
        tags: ['Payments & Settlements'],
        summary: 'Initiate Customer Payment Transaction',
        description: 'Creates a pending payment transaction record for digital gateway authorization (bKash, Nagad, etc.) with exact poisha precision.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  orderId: { type: 'string', example: 'ord_01j7x4b9e8m02k3f8d7c6b5a1' },
                  gatewayProvider: { type: 'string', enum: ['BKASH', 'NAGAD', 'UPAY', 'ROCKET', 'SSLCOMMERZ', 'COD'] },
                  amountPoisha: { type: 'string', example: '2534850' },
                  currency: { type: 'string', default: 'BDT' },
                  idempotencyKey: { type: 'string', example: 'idemp-pay-001' },
                },
                required: ['orderId', 'gatewayProvider', 'amountPoisha'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Payment initiated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
      get: {
        tags: ['Payments & Settlements'],
        summary: 'List Customer Payments',
        description: 'Retrieves payment history for the authenticated customer or seller.',
        responses: {
          '200': {
            description: 'Payments retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/payments/webhooks/{provider}': {
      post: {
        tags: ['Payments & Settlements'],
        summary: 'Inward Payment Gateway Webhook Callback',
        description: 'Receives and cryptographically verifies provider IPN events using HMAC SHA-256 signatures with replay deduplication.',
        parameters: [
          {
            name: 'provider',
            in: 'path',
            required: true,
            schema: { type: 'string', enum: ['bkash', 'nagad', 'sslcommerz'] },
          },
        ],
        responses: {
          '200': {
            description: 'Webhook processed or deduplicated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/refunds': {
      post: {
        tags: ['Payments & Settlements'],
        summary: 'Initiate Item-Level Partial Refund',
        description: 'Processes a partial or full refund with explicit Product Points rollback, commission adjustments, and ceiling checks.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  paymentId: { type: 'string', example: 'pay_01j7x4b9e8m02k3f8d7c6b5a1' },
                  orderId: { type: 'string', example: 'ord_01j7x4b9e8m02k3f8d7c6b5a1' },
                  amountPoisha: { type: 'string', example: '2199000' },
                  reason: { type: 'string', enum: ['DAMAGED_GOODS', 'DEFECTIVE', 'OUT_OF_STOCK', 'CUSTOMER_CANCEL', 'FRAUD'] },
                  reversalPoints: { type: 'integer', example: 450 },
                },
                required: ['paymentId', 'orderId', 'amountPoisha', 'reason'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Refund initiated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/seller/settlements': {
      get: {
        tags: ['Payments & Settlements'],
        summary: 'List Merchant Settlement Statement Batches',
        description: 'Returns tenant-isolated periodic settlement batches for the authenticated seller.',
        responses: {
          '200': {
            description: 'Settlement batches retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/seller/payouts': {
      get: {
        tags: ['Payments & Settlements'],
        summary: 'List Merchant Electronic Payouts',
        description: 'Returns historical electronic funds transfers (BEFTN, RTGS, bKash) disbursed to the seller bank account.',
        responses: {
          '200': {
            description: 'Payout records retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/seller/staff': {
      get: {
        tags: ['Seller Portal'],
        summary: 'List Store Staff Members',
        description: 'Returns all active staff members with assigned roles and permissions for a merchant store. Strictly tenant-isolated.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'sellerId',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'sel_1j7x4b9e8m02k3f8' },
            description: 'Optional store identifier (required for Super Admin bypass)',
          },
        ],
        responses: {
          '200': {
            description: 'Staff members retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Cross-tenant access violation' },
        },
      },
      post: {
        tags: ['Seller Portal'],
        summary: 'Add or Invite Store Staff Member',
        description: 'Adds an existing user or invites a new person via email/phone as a store staff or manager. Assigns scoped role in IAM and emits outbox event.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sellerId: { type: 'string', example: 'sel_1j7x4b9e8m02k3f8' },
                  userId: { type: 'string', example: 'usr_1j7x4b9e8m02k3f8' },
                  email: { type: 'string', example: 'staff@store.com' },
                  phone: { type: 'string', example: '+8801712345678' },
                  name: { type: 'string', example: 'Staff Name' },
                  roleCode: { type: 'string', example: 'SELLER_STAFF' },
                  permissions: { type: 'array', items: { type: 'string' } },
                },
                required: ['sellerId'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Staff member added successfully' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Cross-tenant or lacking permissions' },
          '422': { description: 'Validation failed' },
        },
      },
      delete: {
        tags: ['Seller Portal'],
        summary: 'Remove Store Staff Member',
        description: 'Removes a staff member from the merchant store and revokes their scoped IAM role assignment.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sellerId: { type: 'string', example: 'sel_1j7x4b9e8m02k3f8' },
                  userId: { type: 'string', example: 'usr_1j7x4b9e8m02k3f8' },
                },
                required: ['sellerId', 'userId'],
              },
            },
          },
        },
        parameters: [
          {
            name: 'sellerId',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'sel_1j7x4b9e8m02k3f8' },
          },
          {
            name: 'userId',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'usr_1j7x4b9e8m02k3f8' },
          },
        ],
        responses: {
          '200': { description: 'Staff member removed successfully' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/seller/staff/invite': {
      post: {
        tags: ['Seller Portal'],
        summary: 'Invite Store Staff Member via Email',
        description: 'Invites a user by email to join the merchant store staff with specified permissions.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sellerId: { type: 'string', example: 'sel_1j7x4b9e8m02k3f8' },
                  email: { type: 'string', example: 'staff@store.com' },
                  name: { type: 'string', example: 'Staff Member' },
                  phone: { type: 'string', example: '+8801712345678' },
                  roleCode: { type: 'string', enum: ['SELLER_STAFF', 'SELLER_MANAGER'], default: 'SELLER_STAFF' },
                  permissions: { type: 'array', items: { type: 'string' } },
                },
                required: ['sellerId', 'email', 'name'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Staff invitation created successfully' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/support/tickets': {
      get: {
        tags: ['Customer Support'],
        summary: 'List Support Tickets',
        description: 'Returns support tickets scoped to caller: customers see their own, merchants see their store issues, and support agents see the queue.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Tickets retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Customer Support'],
        summary: 'Create Customer Support Ticket',
        description: 'Opens a new incident or inquiry ticket for an authenticated customer or seller.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  subject: { type: 'string', example: 'Damaged item received' },
                  description: { type: 'string', example: 'The box was torn and contents were broken.' },
                  category: { type: 'string', enum: ['ORDER_INQUIRY', 'DELIVERY_DELAY', 'PAYMENT_ISSUE', 'REFUND_REQUEST', 'PRODUCT_DEFECT', 'ACCOUNT_SECURITY', 'SELLER_ONBOARDING', 'GENERAL_INQUIRY'], default: 'ORDER_INQUIRY' },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
                  orderId: { type: 'string', example: 'ord_1j7x4b9e8m02k3f8' },
                  sellerId: { type: 'string', example: 'sel_1j7x4b9e8m02k3f8' },
                },
                required: ['subject', 'description'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Ticket created successfully' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/support/tickets/{id}': {
      get: {
        tags: ['Customer Support'],
        summary: 'Get Support Ticket Details',
        description: 'Retrieves complete ticket message thread and status. Enforces ownership and support authorization.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'tkt_12345' },
          },
        ],
        responses: {
          '200': { description: 'Ticket details retrieved' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Ownership violation' },
          '404': { description: 'Ticket not found' },
        },
      },
      post: {
        tags: ['Customer Support'],
        summary: 'Reply to Support Ticket',
        description: 'Appends a response message from the ticket owner or assigned support agent.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'tkt_12345' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'We have dispatched your replacement.' },
                },
                required: ['message'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Reply posted successfully' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '422': { description: 'Validation failed' },
        },
      },
      patch: {
        tags: ['Customer Support'],
        summary: 'Resolve Support Ticket',
        description: 'Closes or resolves a support ticket.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'tkt_12345' },
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  resolutionNote: { type: 'string', example: 'Replacement issued and customer satisfied.' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Ticket marked resolved' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/api/v1/rider/assignments': {
      post: {
        tags: ['Logistics & Delivery'],
        summary: 'Accept Delivery Assignment',
        description: 'Atomically claims an available shipment assignment using lease verification to prevent double-assignment.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  deliveryId: { type: 'string', example: 'shp_1j7x4b9e8m02k3f8' },
                  leaseToken: { type: 'string', example: 'lse_12345' },
                },
                required: ['deliveryId'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Assignment claimed successfully' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Double-assignment or lacking rider role' },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/rider/location': {
      post: {
        tags: ['Logistics & Delivery'],
        summary: 'Publish Live Rider GPS Location',
        description: 'Ingests live coordinates from mobile rider app. Compact JSON, throttled in cache.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  deliveryId: { type: 'string', example: 'shp_1j7x4b9e8m02k3f8' },
                  latitude: { type: 'number', example: 23.8103 },
                  longitude: { type: 'number', example: 90.4125 },
                  speed: { type: 'number', example: 28.5 },
                  heading: { type: 'number', example: 180.0 },
                },
                required: ['latitude', 'longitude'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Location recorded successfully' },
          '401': { description: 'Unauthorized' },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/wallets': {
      get: {
        tags: ['Wallet & Ledger'],
        summary: 'List Multi-Account User Wallets',
        description: 'Returns segregated balances for Main, Shopping, Good-Luck, and Charity wallets in integer minor unit poisha.',
        responses: {
          '200': {
            description: 'Wallets retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/points': {
      get: {
        tags: ['Product Points'],
        summary: 'Get Decoupled Product Points Balance',
        description: 'Retrieves available, pending escrow, and lifetime Product Points with chronological event stream.',
        responses: {
          '200': {
            description: 'Point account retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/ranks': {
      get: {
        tags: ['Product Points'],
        summary: 'Get Customer Club Rank & Star Bands',
        description: 'Returns customer qualification progress across Bronze, Silver, Gold tiers and competitive Star bands.',
        responses: {
          '200': {
            description: 'Rank status retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/admin/ledger/journals': {
      get: {
        tags: ['Wallet & Ledger'],
        summary: 'Audit Double-Entry Journal Transactions',
        description: 'Queries balanced double-entry journals with debit and credit breakdown conserving zero-sum accounting.',
        responses: {
          '200': {
            description: 'Journals retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/system/database/dictionary': {
      get: {
        tags: ['Database & Migrations'],
        summary: 'Database Data Dictionary Discovery',
        description: 'Returns the catalog of all 49 canonical relational Prisma models classified by lifecycle deletion policy (IMMUTABLE, SOFT_DELETE, EPHEMERAL).',
        responses: {
          '200': {
            description: 'Data dictionary metadata retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DataDictionarySummary' },
              },
            },
          },
        },
      },
    },
    '/api/v1/system/database/migrations': {
      get: {
        tags: ['Database & Migrations'],
        summary: 'Migration Sequence & Zero-Downtime Status',
        description: 'Returns applied migration sequences, expand-and-contract phase health, and forward-fix audit records.',
        responses: {
          '200': {
            description: 'Migration sequence retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MigrationStatus' },
              },
            },
          },
        },
      },
    },
    '/api/v1/system/languages': {
      get: {
        tags: ['Internationalization & Localization'],
        summary: 'List Supported Platform Languages',
        description: 'Returns all registered languages with active/default status, native names, and word for language translations.',
        responses: {
          '200': {
            description: 'Languages retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LanguageListResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Internationalization & Localization'],
        summary: 'Register New Platform Language Dynamically',
        description: 'Dynamically registers a new language code with native display names and RTL/LTR text direction.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddLanguageRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Language registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LanguageListResponse' },
              },
            },
          },
          '409': {
            description: 'Language code already registered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/system/languages/default': {
      patch: {
        tags: ['Internationalization & Localization'],
        summary: 'Set Platform Default Language',
        description: 'Designates an active registered language code as the authoritative system-wide default locale.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SetDefaultLanguageRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Default language updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LanguageListResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/system/languages/{code}': {
      patch: {
        tags: ['Internationalization & Localization'],
        summary: 'Update Language Metadata or Status',
        description: 'Updates display name, native name, or toggles active status for a registered language.',
        parameters: [
          {
            name: 'code',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'bn' },
            description: 'Language ISO code',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateLanguageRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Language updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LanguageListResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Internationalization & Localization'],
        summary: 'Delete or Deregister Language',
        description: 'Removes a non-default language from platform availability.',
        parameters: [
          {
            name: 'code',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'ar' },
            description: 'Language ISO code to remove',
          },
        ],
        responses: {
          '200': {
            description: 'Language removed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LanguageListResponse' },
              },
            },
          },
          '400': {
            description: 'Cannot remove default or sole registered language',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/v1/iam/roles': {
      get: {
        tags: ['Identity & Access Management'],
        summary: 'List All RBAC Roles',
        description: 'Retrieves all platform and custom RBAC roles with system flags and descriptions. Requires roles:read permission.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of roles retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: 'rol_1j7x4b9e8m02k3f8' },
                          code: { type: 'string', example: 'SUPER_ADMIN' },
                          name: { type: 'string', example: 'Super Administrator' },
                          description: { type: 'string', example: 'Platform owner with unrestricted access' },
                          isSystem: { type: 'boolean', example: true },
                          version: { type: 'number', example: 1 },
                        },
                      },
                    },
                    meta: {
                      type: 'object',
                      properties: { total: { type: 'number', example: 7 } },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
          '403': {
            description: 'Forbidden: Insufficient privileges',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/iam/roles/assign': {
      post: {
        tags: ['Identity & Access Management'],
        summary: 'Assign Role to User',
        description: 'Assigns an RBAC role to a user. Seller-scoped roles require sellerId. Enforces maker privileges. Requires roles:assign permission.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: { type: 'string', example: 'usr_1j7x4b9e8m02k3f8' },
                  roleId: { type: 'string', example: 'rol_1j7x4b9e8m02k3f8' },
                  sellerId: { type: 'string', nullable: true, example: 'sel_1j7x4b9e8m02k3f8' },
                },
                required: ['userId', 'roleId'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Role assigned successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { message: { type: 'string', example: 'Role assigned successfully' } },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
          '403': {
            description: 'Forbidden: Cannot assign role without requisite privileges',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
          '422': {
            description: 'Validation error: Missing sellerId for seller role or invalid ID',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/iam/roles/revoke': {
      post: {
        tags: ['Identity & Access Management'],
        summary: 'Revoke Role from User',
        description: 'Revokes a user role assignment. Requires roles:assign permission or SELLER_OWNER for own staff.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  assignmentId: { type: 'string', nullable: true, example: 'ura_1j7x4b9e8m02k3f8' },
                  userId: { type: 'string', nullable: true, example: 'usr_1j7x4b9e8m02k3f8' },
                  roleId: { type: 'string', nullable: true, example: 'rol_1j7x4b9e8m02k3f8' },
                  sellerId: { type: 'string', nullable: true, example: 'sel_1j7x4b9e8m02k3f8' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Role revoked successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { message: { type: 'string', example: 'Role revoked successfully' } },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
          '403': {
            description: 'Forbidden: Insufficient privileges to revoke role',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/iam/permissions': {
      get: {
        tags: ['Identity & Access Management'],
        summary: 'List All Permissions',
        description: 'Retrieves all granular permissions grouped by functional module (IAM, SELLER, CATALOG, ORDER, FINANCE, SYSTEM). Requires permissions:read.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Permissions list retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        permissions: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', example: 'prm_1j7x4b9e8m02k3f8' },
                              code: { type: 'string', example: 'users:read' },
                              name: { type: 'string', example: 'View Users' },
                              module: { type: 'string', example: 'IAM' },
                              description: { type: 'string', example: 'View user profiles' },
                            },
                          },
                        },
                        byModule: { type: 'object' },
                      },
                    },
                    meta: {
                      type: 'object',
                      properties: { total: { type: 'number', example: 25 } },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
          '403': {
            description: 'Forbidden: Insufficient privileges',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/admin/audit': {
      get: {
        tags: ['Audit & Compliance'],
        summary: 'Explore Historical Audit Logs',
        description: 'Returns paginated, multi-parameter filtered immutable audit log records. Strictly requires Super Administrator authority or system:audit_read permission.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'actorId', in: 'query', schema: { type: 'string' } },
          { name: 'actorRole', in: 'query', schema: { type: 'string' } },
          { name: 'action', in: 'query', schema: { type: 'string' } },
          { name: 'resource', in: 'query', schema: { type: 'string' } },
          { name: 'resourceId', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Audit logs retrieved successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication credentials required' },
          '403': { description: 'Forbidden: Requires system:audit_read permission' },
          '422': { description: 'Validation failed on query parameters' },
        },
      },
    },
    '/api/v1/admin/audit/{id}': {
      get: {
        tags: ['Audit & Compliance'],
        summary: 'Get Audit Log Entry by ID',
        description: 'Retrieves a single immutable audit log entry by its primary identifier with complete state diff and sanitized metadata.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'aud_12345' } },
        ],
        responses: {
          '200': {
            description: 'Audit log entry retrieved successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
          },
          '401': { description: 'Authentication credentials required' },
          '403': { description: 'Forbidden: Requires system:audit_read permission' },
          '404': { description: 'Audit log record not found' },
        },
      },
      delete: {
        tags: ['Audit & Compliance'],
        summary: 'Prohibited Mutation (Immutable Audit Invariant)',
        description: 'Always returns HTTP 405. Audit records are append-only under ADR-0022 and can never be deleted.',
        security: [{ BearerAuth: [] }],
        responses: {
          '405': { description: 'Method Not Allowed: Audit logs are immutable append-only records.' },
        },
      },
    },
    '/api/v1/content/{slug}': {
      get: {
        tags: ['Catalog'],
        summary: 'Read published localized CMS content',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'locale', in: 'query', required: false, schema: { type: 'string', example: 'bn-BD' } },
        ],
        responses: {
          '200': { description: 'Published content returned with locale fallback' },
          '404': { description: 'Published content not found' },
        },
      },
    },
    '/api/v1/admin/content': {
      post: {
        tags: ['Catalog'],
        summary: 'Create localized CMS content',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CmsContentWriteRequest' } } } },
        responses: { '201': { description: 'CMS content created' }, '400': { description: 'Validation failed' }, '403': { description: 'Administrator access required' } },
      },
    },
    '/api/v1/admin/content/{id}': {
      patch: {
        tags: ['Catalog'],
        summary: 'Update localized CMS content with optimistic concurrency',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CmsContentWriteRequest' } } } },
        responses: { '200': { description: 'CMS content updated' }, '409': { description: 'Version conflict' }, '403': { description: 'Administrator access required' } },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT bearer token in the format: Bearer <token>',
      },
    },
    schemas: {
      ApiSuccessEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
        },
        required: ['success', 'data'],
      },
      CmsContentWriteRequest: {
        type: 'object',
        required: ['contentType', 'slug', 'translations'],
        properties: {
          contentType: { type: 'string', example: 'landing_page' },
          slug: { type: 'string', example: 'about-alifworld' },
          status: { type: 'string', enum: ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'] },
          version: { type: 'integer', minimum: 1 },
          translations: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['locale', 'title', 'body'],
              properties: {
                locale: { type: 'string', example: 'bn-BD' },
                title: { type: 'string' },
                body: { type: 'object', additionalProperties: true },
                seoTitle: { type: 'string' },
                seoDescription: { type: 'string' },
              },
            },
          },
        },
      },
      ApiErrorEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_FAILED' },
              message: { type: 'string', example: 'Invalid payload submitted' },
              details: { type: 'object', nullable: true },
            },
            required: ['code', 'message'],
          },
        },
        required: ['success', 'error'],
      },
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'pay_01j7x4b9e8m02k3f8d7c6b5a1' },
          orderId: { type: 'string', example: 'ord_01j7x4b9e8m02k3f8d7c6b5a1' },
          paymentNumber: { type: 'string', example: 'PAY-20260922-0001' },
          gatewayProvider: { type: 'string', enum: ['BKASH', 'NAGAD', 'UPAY', 'ROCKET', 'SSLCOMMERZ', 'COD'] },
          gatewayTransactionId: { type: 'string', example: 'TRX99201948BK' },
          status: { type: 'string', enum: ['PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
          amountPoisha: { type: 'string', example: '2534850' },
          currency: { type: 'string', example: 'BDT' },
          feePoisha: { type: 'string', example: '38023' },
          capturedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'orderId', 'paymentNumber', 'gatewayProvider', 'status', 'amountPoisha', 'currency'],
      },
      Refund: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'ref_01j7x4b9e8m02k3f8d7c6b5a1' },
          paymentId: { type: 'string', example: 'pay_01j7x4b9e8m02k3f8d7c6b5a1' },
          orderId: { type: 'string', example: 'ord_01j7x4b9e8m02k3f8d7c6b5a1' },
          refundNumber: { type: 'string', example: 'REF-20260922-0001' },
          amountPoisha: { type: 'string', example: '2199000' },
          currency: { type: 'string', example: 'BDT' },
          status: { type: 'string', enum: ['PENDING', 'APPROVED', 'PROCESSED', 'FAILED', 'REJECTED'] },
          reversalPoints: { type: 'integer', example: 450 },
          reason: { type: 'string', example: 'DAMAGED_GOODS' },
        },
        required: ['id', 'paymentId', 'orderId', 'refundNumber', 'amountPoisha', 'status', 'reversalPoints'],
      },
      SellerSettlement: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'stl_01j7x4b9e8m02k3f8d7c6b5a1' },
          sellerId: { type: 'string', example: 'sel_01j7x4b9e8m02k3f8d7c6b5a1' },
          settlementNumber: { type: 'string', example: 'STL-20260922-0001' },
          periodStart: { type: 'string', format: 'date-time' },
          periodEnd: { type: 'string', format: 'date-time' },
          grossOrderPoisha: { type: 'string', example: '2199000' },
          commissionPoisha: { type: 'string', example: '109950' },
          netPayoutPoisha: { type: 'string', example: '2424900' },
          status: { type: 'string', enum: ['PENDING', 'AUDITED', 'APPROVED', 'DISBURSED'] },
        },
        required: ['id', 'sellerId', 'settlementNumber', 'periodStart', 'periodEnd', 'grossOrderPoisha', 'commissionPoisha', 'netPayoutPoisha', 'status'],
      },
      Wallet: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'wal_01j7x4b9e8m02k3f8d7c6b5a1' },
          type: { type: 'string', enum: ['MAIN', 'SHOPPING', 'GOOD_LUCK', 'CHARITY', 'SYSTEM_RESERVE'] },
          currency: { type: 'string', example: 'BDT' },
          availablePoisha: { type: 'string', example: '50000' },
          pendingPoisha: { type: 'string', example: '0' },
          status: { type: 'string', enum: ['ACTIVE', 'FROZEN', 'CLOSED'] },
        },
        required: ['id', 'type', 'currency', 'availablePoisha', 'pendingPoisha', 'status'],
      },
      PointAccount: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'pac_01j7x4b9e8m02k3f8d7c6b5a1' },
          userId: { type: 'string', example: 'usr_01j7x4b9e8m02k3f8d7c6b5a1' },
          availablePoints: { type: 'integer', example: 450 },
          pendingPoints: { type: 'integer', example: 0 },
          lifetimePoints: { type: 'integer', example: 450 },
        },
        required: ['id', 'userId', 'availablePoints', 'pendingPoints', 'lifetimePoints'],
      },
      LedgerJournal: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'jrn_01j7x4b9e8m02k3f8d7c6b5a1' },
          journalNumber: { type: 'string', example: 'JRN-20260922-0001' },
          description: { type: 'string', example: 'Customer order reward distribution' },
          referenceType: { type: 'string', example: 'REWARD_DISTRIBUTION' },
          totalPoisha: { type: 'string', example: '100000' },
          ruleVersion: { type: 'string', example: 'v1.0.0' },
          postedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'journalNumber', 'description', 'referenceType', 'totalPoisha', 'postedAt'],
      },
      DataDictionarySummary: {
        type: 'object',
        properties: {
          totalModels: { type: 'integer', example: 49 },
          lifecycleBreakdown: {
            type: 'object',
            properties: {
              immutable: { type: 'integer', example: 17 },
              softDelete: { type: 'integer', example: 30 },
              ephemeral: { type: 'integer', example: 2 },
            },
            required: ['immutable', 'softDelete', 'ephemeral'],
          },
          models: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Order' },
                tableName: { type: 'string', example: 'orders' },
                deletionPolicy: { type: 'string', enum: ['IMMUTABLE', 'SOFT_DELETE', 'EPHEMERAL'] },
                fieldsCount: { type: 'integer', example: 22 },
              },
              required: ['name', 'tableName', 'deletionPolicy'],
            },
          },
        },
        required: ['totalModels', 'lifecycleBreakdown'],
      },
      MigrationStatus: {
        type: 'object',
        properties: {
          currentMigration: { type: 'string', example: '20260922000008_wallets_points_rewards_ranks_immutable_ledgers' },
          appliedMigrationsCount: { type: 'integer', example: 8 },
          expandContractPhase: { type: 'string', enum: ['EXPAND', 'DUAL_WRITE', 'BACKFILL', 'CONTRACT', 'STABLE'], example: 'STABLE' },
          status: { type: 'string', example: 'HEALTHY' },
        },
        required: ['currentMigration', 'appliedMigrationsCount', 'expandContractPhase', 'status'],
      },
      TokenPolicyResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              tokenPolicies: {
                type: 'object',
                properties: {
                  accessTokenTtlSeconds: { type: 'integer', example: 900 },
                  webRefreshTokenTtlSeconds: { type: 'integer', example: 604800 },
                  mobileRefreshTokenTtlSeconds: { type: 'integer', example: 2592000 },
                  sessionInactivityTimeoutSeconds: { type: 'integer', example: 172800 },
                  maxActiveSessionsPerUser: { type: 'integer', example: 5 },
                  otpTokenTtlSeconds: { type: 'integer', example: 300 },
                  maxOtpAttempts: { type: 'integer', example: 3 },
                },
                required: ['accessTokenTtlSeconds', 'webRefreshTokenTtlSeconds', 'mobileRefreshTokenTtlSeconds', 'maxActiveSessionsPerUser'],
              },
              cookieSettings: {
                type: 'object',
                properties: {
                  accessTokenCookie: { type: 'string', example: 'aw_access_token' },
                  refreshTokenCookie: { type: 'string', example: 'aw_refresh_token' },
                  httpOnly: { type: 'boolean', example: true },
                  sameSite: { type: 'string', example: 'lax' },
                  path: { type: 'string', example: '/' },
                },
              },
              passwordRequirements: {
                type: 'object',
                properties: {
                  minLength: { type: 'integer', example: 8 },
                  maxLength: { type: 'integer', example: 128 },
                  rules: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
              supportedClientTypes: {
                type: 'array',
                items: { type: 'string' },
                example: ['WEB', 'MOBILE_FLUTTER', 'POS', 'ADMIN_PORTAL'],
              },
              supportedTokenTypes: {
                type: 'array',
                items: { type: 'string' },
                example: ['Bearer'],
              },
            },
            required: ['tokenPolicies', 'cookieSettings', 'passwordRequirements'],
          },
        },
        required: ['success', 'data'],
      },
      RefreshTokenRequest: {
        type: 'object',
        properties: {
          refreshToken: {
            type: 'string',
            description: 'The refresh token to rotate (optional if supplied via aw_refresh_token HttpOnly cookie)',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
      },
      RefreshTokenResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              tokenType: { type: 'string', example: 'Bearer' },
              expiresIn: { type: 'integer', example: 900 },
              familyId: { type: 'string', example: 'fam_01j7x4b9e8m02k3f8d7c6b5a1' },
              generation: { type: 'integer', example: 1 },
            },
            required: ['accessToken', 'refreshToken', 'tokenType', 'expiresIn', 'familyId', 'generation'],
          },
        },
        required: ['success', 'data'],
      },
      LogoutResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Logged out successfully' },
            },
            required: ['message'],
          },
        },
        required: ['success', 'data'],
      },
      SessionItem: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'ses_01j7x4b9e8m02k3f8d7c6b5a1' },
          clientType: { type: 'string', enum: ['WEB', 'MOBILE_FLUTTER', 'POS', 'ADMIN_PORTAL'], example: 'WEB' },
          deviceSummary: { type: 'string', example: 'Google Chrome on macOS' },
          ipAddress: { type: 'string', nullable: true, example: '103.112.*.*' },
          userAgent: { type: 'string', nullable: true, example: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...' },
          isCurrent: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time', example: '2026-09-22T12:00:00.000Z' },
          lastActiveAt: { type: 'string', format: 'date-time', example: '2026-09-22T12:30:00.000Z' },
          expiresAt: { type: 'string', format: 'date-time', example: '2026-09-29T12:00:00.000Z' },
        },
        required: ['id', 'clientType', 'deviceSummary', 'isCurrent', 'createdAt', 'lastActiveAt', 'expiresAt'],
      },
      SessionListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              sessions: {
                type: 'array',
                items: { $ref: '#/components/schemas/SessionItem' },
              },
              total: { type: 'integer', example: 2 },
              currentSessionId: { type: 'string', example: 'ses_01j7x4b9e8m02k3f8d7c6b5a1' },
            },
            required: ['sessions', 'total', 'currentSessionId'],
          },
        },
        required: ['success', 'data'],
      },
      RevokeSessionResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Session revoked successfully' },
              sessionId: { type: 'string', example: 'ses_01j7x4b9e8m02k3f8d7c6b5a1' },
              isCurrent: { type: 'boolean', example: false },
            },
            required: ['message', 'sessionId', 'isCurrent'],
          },
        },
        required: ['success', 'data'],
      },
      RevokeOthersResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'All other sessions have been logged out successfully' },
              revokedCount: { type: 'integer', example: 3 },
              currentSessionId: { type: 'string', example: 'ses_01j7x4b9e8m02k3f8d7c6b5a1' },
            },
            required: ['message', 'revokedCount', 'currentSessionId'],
          },
        },
        required: ['success', 'data'],
      },
      RevokeAllResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'All sessions terminated everywhere. Please sign in again.' },
              tokenVersion: { type: 'integer', example: 2 },
            },
            required: ['message', 'tokenVersion'],
          },
        },
        required: ['success', 'data'],
      },
      PasswordResetRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', example: 'customer@example.com' },
          locale: { type: 'string', enum: ['en-BD', 'bn-BD'], default: 'bn-BD' },
        },
        required: ['email'],
      },
      PasswordResetRequestResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              accepted: { type: 'boolean', const: true },
              message: { type: 'string' },
              cooldownSeconds: { type: 'integer', example: 60 },
            },
            required: ['accepted', 'message', 'cooldownSeconds'],
          },
        },
        required: ['success', 'data'],
      },
      PasswordResetCompletionRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          token: { type: 'string', minLength: 32, writeOnly: true },
          newPassword: { type: 'string', format: 'password', minLength: 8, maxLength: 128, writeOnly: true },
          confirmPassword: { type: 'string', format: 'password', maxLength: 128, writeOnly: true },
        },
        required: ['email', 'token', 'newPassword', 'confirmPassword'],
      },
      PasswordChangeRequest: {
        type: 'object',
        properties: {
          currentPassword: { type: 'string', format: 'password', maxLength: 128, writeOnly: true },
          newPassword: { type: 'string', format: 'password', minLength: 8, maxLength: 128, writeOnly: true },
          confirmPassword: { type: 'string', format: 'password', maxLength: 128, writeOnly: true },
        },
        required: ['currentPassword', 'newPassword', 'confirmPassword'],
      },
      PasswordMutationResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              passwordReset: { type: 'boolean' },
              passwordChanged: { type: 'boolean' },
              sessionsRevoked: { type: 'boolean', const: true },
              message: { type: 'string' },
            },
            required: ['sessionsRevoked', 'message'],
          },
        },
        required: ['success', 'data'],
      },
      OAuthVerifyRequest: {
        type: 'object',
        properties: {
          idToken: { type: 'string', description: 'Google ID token from Flutter SDK' },
          accessToken: { type: 'string', description: 'Facebook access token from Flutter SDK' },
          clientType: { type: 'string', enum: ['MOBILE_FLUTTER', 'WEB', 'POS'], default: 'MOBILE_FLUTTER' },
          deviceInfo: { type: 'string', example: 'Google Pixel 8 (Android 14)' },
        },
      },
      OAuthVerifyResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/AuthUser' },
              tokens: { $ref: '#/components/schemas/AuthTokenPair' },
              sessionId: { type: 'string', example: 'ses_01HA0000000000000000000000' },
              isNewUser: { type: 'boolean', example: false },
            },
            required: ['user', 'tokens', 'sessionId', 'isNewUser'],
          },
        },
        required: ['success', 'data'],
      },
      TokenIntrospectRequest: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
        required: ['token'],
      },
      TokenIntrospectResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              active: { type: 'boolean', example: true },
              sub: { type: 'string', example: 'usr_01j7x4b9e8m02k3f8d7c6b5a1' },
              email: { type: 'string', example: 'customer@alifworld.com' },
              roles: {
                type: 'array',
                items: { type: 'string' },
                example: ['CUSTOMER'],
              },
              permissions: {
                type: 'array',
                items: { type: 'string' },
                example: ['orders:read', 'orders:create'],
              },
              sellerId: { type: 'string', nullable: true },
              clientType: { type: 'string', example: 'WEB' },
              tokenVersion: { type: 'integer', example: 1 },
              exp: { type: 'integer', example: 1727006400 },
              iat: { type: 'integer', example: 1727005500 },
              error: { type: 'string' },
            },
            required: ['active'],
          },
        },
        required: ['success', 'data'],
      },
      CustomerRegisterRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Tanvir Ahmed' },
          email: { type: 'string', format: 'email', example: 'tanvir@example.com' },
          phone: { type: 'string', example: '+8801700112233' },
          password: { type: 'string', format: 'password', example: 'Dhaka@Commerce#2026!' },
          locale: { type: 'string', enum: ['bn-BD', 'en-BD'], default: 'bn-BD' },
          acceptTerms: { type: 'boolean', example: true },
        },
        required: ['name', 'email', 'password', 'acceptTerms'],
      },
      CustomerRegisterResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              userId: { type: 'string', example: 'usr_01j7x4b9e8m02k3f8d7c6b5a1' },
              email: { type: 'string', example: 'tanvir@example.com' },
              name: { type: 'string', example: 'Tanvir Ahmed' },
              phone: { type: 'string', example: '+8801700112233', nullable: true },
              status: { type: 'string', example: 'ACTIVE' },
              isEmailVerified: { type: 'boolean', example: false },
              message: { type: 'string', example: 'Account registered successfully. A 6-digit verification code has been sent to your email.' },
            },
            required: ['userId', 'email', 'name', 'status', 'isEmailVerified', 'message'],
          },
        },
        required: ['success', 'data'],
      },
      VerifyEmailRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', example: 'tanvir@example.com' },
          code: { type: 'string', minLength: 6, maxLength: 6, example: '582914' },
        },
        required: ['email', 'code'],
      },
      VerifyEmailResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              verified: { type: 'boolean', example: true },
              alreadyVerified: { type: 'boolean', example: false },
              email: { type: 'string', example: 'tanvir@example.com' },
              userId: { type: 'string', example: 'usr_01j7x4b9e8m02k3f8d7c6b5a1' },
              message: { type: 'string', example: 'Email verified successfully! You can now log in to your AlifWorld account.' },
            },
            required: ['verified', 'email', 'message'],
          },
        },
        required: ['success', 'data'],
      },
      ResendVerificationRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', example: 'tanvir@example.com' },
        },
        required: ['email'],
      },
      ResendVerificationResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              alreadyVerified: { type: 'boolean', example: false },
              message: { type: 'string', example: 'A new 6-digit verification code has been sent to your email.' },
              cooldownSeconds: { type: 'integer', example: 60 },
              devVerificationCode: { type: 'string', example: '582914' },
            },
            required: ['success', 'message', 'cooldownSeconds'],
          },
        },
        required: ['success', 'data'],
      },
      PhoneCheckRequest: {
        type: 'object',
        properties: {
          phone: { type: 'string', example: '01711223344', description: 'Bangladesh phone number' },
        },
        required: ['phone'],
      },
      PhoneCheckResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              phone: { type: 'string', example: '+8801711223344' },
              exists: { type: 'boolean', example: true },
              registered: { type: 'boolean', example: true },
              name: { type: 'string', example: 'Rahim Khan', nullable: true },
              status: { type: 'string', example: 'ACTIVE', nullable: true },
            },
            required: ['phone', 'exists', 'registered'],
          },
        },
        required: ['success', 'data'],
      },
      PhoneSendOtpRequest: {
        type: 'object',
        properties: {
          phone: { type: 'string', example: '01711223344' },
          purpose: { type: 'string', enum: ['LOGIN', 'REGISTER'], default: 'LOGIN' },
        },
        required: ['phone'],
      },
      PhoneSendOtpResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              phone: { type: 'string', example: '+8801711223344' },
              cooldownSeconds: { type: 'integer', example: 60 },
              expiresInSeconds: { type: 'integer', example: 300 },
              message: { type: 'string', example: 'Verification code sent successfully.' },
              devOtp: { type: 'string', example: '123456' },
            },
            required: ['phone', 'cooldownSeconds', 'expiresInSeconds', 'message'],
          },
        },
        required: ['success', 'data'],
      },
      PhoneVerifyLoginRequest: {
        type: 'object',
        properties: {
          phone: { type: 'string', example: '01711223344' },
          code: { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
          clientType: { type: 'string', enum: ['WEB', 'MOBILE_FLUTTER', 'POS', 'ADMIN_PORTAL'], default: 'WEB' },
          deviceInfo: { type: 'string', example: 'Chrome on macOS' },
        },
        required: ['phone', 'code'],
      },
      PhoneVerifyRegisterRequest: {
        type: 'object',
        properties: {
          phone: { type: 'string', example: '01711223344' },
          code: { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
        },
        required: ['phone', 'code'],
      },
      PhoneVerifyRegisterResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              phone: { type: 'string', example: '+8801711223344' },
              verified: { type: 'boolean', example: true },
              verificationTicket: { type: 'string', example: 'regticket_a89f...' },
              expiresInSeconds: { type: 'integer', example: 1800 },
              message: { type: 'string', example: 'Phone number verified. Please complete profile details.' },
            },
            required: ['phone', 'verified', 'verificationTicket', 'message'],
          },
        },
        required: ['success', 'data'],
      },
      PhoneCompleteRegistrationRequest: {
        type: 'object',
        properties: {
          phone: { type: 'string', example: '01711223344' },
          verificationTicket: { type: 'string', example: 'regticket_a89f...' },
          firstName: { type: 'string', example: 'Tanvir' },
          lastName: { type: 'string', example: 'Ahmed' },
          password: { type: 'string', format: 'password', example: 'SecureP@ss2026' },
          confirmPassword: { type: 'string', format: 'password', example: 'SecureP@ss2026' },
          address: { type: 'string', nullable: true, example: 'House 12, Road 4, Dhanmondi' },
          division: { type: 'string', nullable: true, example: 'Dhaka' },
          city: { type: 'string', nullable: true, example: 'Dhaka' },
          birthday: { type: 'string', format: 'date', nullable: true, example: '1995-06-15' },
          gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'], nullable: true, example: 'MALE' },
          clientType: { type: 'string', enum: ['WEB', 'MOBILE_FLUTTER', 'POS', 'ADMIN_PORTAL'], default: 'WEB' },
        },
        required: ['phone', 'verificationTicket', 'firstName', 'lastName', 'password', 'confirmPassword'],
      },
      LoginRequest: {
        type: 'object',
        properties: {
          identifier: { type: 'string', example: 'tanvir@example.com', description: 'Email address or Bangladesh mobile number (e.g. 01700112233)' },
          password: { type: 'string', format: 'password', example: 'Dhaka@Commerce#2026!' },
          clientType: { type: 'string', enum: ['WEB', 'MOBILE_FLUTTER', 'POS', 'ADMIN_PORTAL'], default: 'WEB' },
          deviceInfo: { type: 'string', example: 'iPhone 15 Pro (iOS 18.0)' },
        },
        required: ['identifier', 'password'],
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'usr_01j7x4b9e8m02k3f8d7c6b5a1' },
                  email: { type: 'string', example: 'tanvir@example.com' },
                  phone: { type: 'string', example: '+8801700112233', nullable: true },
                  name: { type: 'string', example: 'Tanvir Ahmed' },
                  status: { type: 'string', example: 'ACTIVE' },
                  isEmailVerified: { type: 'boolean', example: true },
                  isPhoneVerified: { type: 'boolean', example: true },
                  roles: { type: 'array', items: { type: 'string' }, example: ['CUSTOMER'] },
                  permissions: { type: 'array', items: { type: 'string' }, example: ['orders:create', 'orders:read'] },
                  sellerId: { type: 'string', nullable: true },
                  lastLoginAt: { type: 'string', format: 'date-time' },
                },
                required: ['id', 'status', 'isEmailVerified', 'roles'],
              },
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                  refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                  tokenType: { type: 'string', example: 'Bearer' },
                  expiresIn: { type: 'integer', example: 900 },
                  refreshExpiresIn: { type: 'integer', example: 604800 },
                },
                required: ['accessToken', 'refreshToken', 'tokenType', 'expiresIn'],
              },
              sessionId: { type: 'string', example: 'ses_01j7x4b9e8m02k3f8d7c6b5a1' },
            },
            required: ['user', 'tokens', 'sessionId'],
          },
        },
        required: ['success', 'data'],
      },
      CurrentUserProfileResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'usr_01j7x4b9e8m02k3f8d7c6b5a1' },
              email: { type: 'string', example: 'tanvir@example.com' },
              phone: { type: 'string', example: '+8801700112233', nullable: true },
              name: { type: 'string', example: 'Tanvir Ahmed' },
              avatarUrl: { type: 'string', nullable: true },
              status: { type: 'string', example: 'ACTIVE' },
              isEmailVerified: { type: 'boolean', example: true },
              isPhoneVerified: { type: 'boolean', example: true },
              roles: { type: 'array', items: { type: 'string' }, example: ['CUSTOMER'] },
              permissions: { type: 'array', items: { type: 'string' } },
              sellerId: { type: 'string', nullable: true },
              wallets: {
                type: 'array',
                items: { $ref: '#/components/schemas/Wallet' },
              },
              pointAccount: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  availablePoints: { type: 'integer' },
                  pendingPoints: { type: 'integer' },
                  lifetimePoints: { type: 'integer' },
                },
              },
              lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
            },
            required: ['id', 'status', 'isEmailVerified', 'roles', 'wallets'],
          },
        },
        required: ['success', 'data'],
      },
      LanguageDefinition: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'bn' },
          name: { type: 'string', example: 'বাংলা' },
          nativeName: { type: 'string', example: 'বাংলা' },
          wordForLanguage: { type: 'string', example: 'ভাষা' },
          direction: { type: 'string', enum: ['ltr', 'rtl'], example: 'ltr' },
          isDefault: { type: 'boolean', example: true },
          isActive: { type: 'boolean', example: true },
        },
        required: ['code', 'name', 'nativeName', 'wordForLanguage', 'direction', 'isDefault', 'isActive'],
      },
      LanguageListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              defaultLocale: { type: 'string', example: 'bn' },
              languages: {
                type: 'array',
                items: { $ref: '#/components/schemas/LanguageDefinition' },
              },
            },
            required: ['defaultLocale', 'languages'],
          },
        },
        required: ['success', 'data'],
      },
      AddLanguageRequest: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'ar' },
          name: { type: 'string', example: 'Arabic' },
          nativeName: { type: 'string', example: 'العربية' },
          wordForLanguage: { type: 'string', example: 'لغة' },
          direction: { type: 'string', enum: ['ltr', 'rtl'], default: 'ltr' },
          isActive: { type: 'boolean', default: true },
        },
        required: ['code', 'name', 'nativeName', 'wordForLanguage'],
      },
      SetDefaultLanguageRequest: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'en' },
        },
        required: ['code'],
      },
      UpdateLanguageRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Bengali' },
          nativeName: { type: 'string', example: 'বাংলা' },
          wordForLanguage: { type: 'string', example: 'ভাষা' },
          direction: { type: 'string', enum: ['ltr', 'rtl'] },
          isActive: { type: 'boolean' },
        },
      },
    },
  },
};

export function generateOpenApiJson(): void {
  const outputPath = resolve(process.cwd(), 'public/openapi.json');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2), 'utf-8');
  console.info(`[OpenAPI] Authoritative OpenAPI 3.1 specification generated at: ${outputPath}`);
}

// Execute when run directly via CLI
if (import.meta.main || process.argv[1]?.includes('generate-openapi')) {
  generateOpenApiJson();
}
