# Login and Access Token Issuance Architecture Specification

## 1. Executive Summary

Milestone 034 implements the central login, session establishment, and access-token issuance architecture for AlifWorld. This specification details the end-to-end mechanisms governing multi-identifier user resolution (email or Bangladesh mobile number), constant-time password hash verification, dual-client credential delivery (HttpOnly cookies for web browsers and Bearer tokens for mobile Flutter apps), multi-tenant seller scoping, concurrent session capping, and session introspection (`/api/v1/auth/me`).

The architecture satisfies **ADR-0034**, **ADR-0022**, **ADR-0031**, **ADR-0032**, and **ADR-0033**, ensuring enterprise security compliance, zero credential leakage, and seamless cross-platform identity management.

---

## 2. End-to-End Login & Token Issuance Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as User (Web Browser / Mobile Flutter App)
    participant API as Next.js Route Handler (/api/v1/auth/login)
    participant Validator as Zod Validator (loginSchema)
    participant Service as AuthLoginService
    participant UserRepo as UserRepository
    participant TokenService as AuthTokenService
    participant SessionRepo as SessionRepository
    participant DB as PostgreSQL (users, user_sessions, audit_logs)

    Client->>API: POST /api/v1/auth/login { identifier, password, clientType, deviceInfo }
    API->>Validator: Validate payload & clientType
    Validator-->>API: Validated login parameters

    API->>Service: login(input, { ipAddress, userAgent })
    Service->>UserRepo: findUserByIdentifier(identifier)
    UserRepo->>DB: SELECT user with roles, permissions, ownedSellers, sellerStaff
    DB-->>UserRepo: User record with relationships
    UserRepo-->>Service: User entity

    alt User Not Found or Deleted
        Service-->>API: 401 Unauthorized ("Invalid email/phone or password")
        API-->>Client: HTTP 401 { error: "Invalid email/phone or password" }
    else User is Suspended
        Service-->>API: 401 Unauthorized ("Your account has been suspended...")
        API-->>Client: HTTP 401 { error: "Your account has been suspended..." }
    else Password Mismatch (!verifyPassword)
        Service-->>API: 401 Unauthorized ("Invalid email/phone or password")
        API-->>Client: HTTP 401 { error: "Invalid email/phone or password" }
    else Credentials Valid
        Service->>UserRepo: updateLastLogin(userId)
        Service->>TokenService: issueTokenPair({ user, clientType, deviceInfo, ip, userAgent })
        
        Note over TokenService,SessionRepo: Create Session & Issue Tokens
        TokenService->>SessionRepo: createSession({ userId, sessionToken, clientType, ... })
        SessionRepo->>DB: INSERT into user_sessions
        TokenService->>TokenService: generateRefreshToken(...) (7d Web / 30d Mobile)
        TokenService->>SessionRepo: rotateSessionRefreshToken(sessionId, hash(refreshToken), expiresAt)
        SessionRepo->>DB: UPDATE user_sessions SET refresh_token_hash, expires_at
        TokenService->>SessionRepo: enforceSessionLimit(userId, max=5)
        SessionRepo->>DB: UPDATE user_sessions SET is_revoked = true (for surplus sessions)
        TokenService->>TokenService: generateAccessToken(...) (15m TTL HS256)
        TokenService-->>Service: TokenPairResult { accessToken, refreshToken, cookies }

        Service->>DB: INSERT into audit_logs (action: 'USER_LOGIN')
        Service-->>API: LoginResult { user, tokens, cookies }

        alt Web Client (clientType == 'WEB')
            Note over API: Set HttpOnly, Secure cookies: aw_access_token & aw_refresh_token
        end

        API-->>Client: HTTP 200 OK { success: true, data: { user, tokens, sessionId } }
    end
```

---

## 3. Current User Profile Flow (`GET /api/v1/auth/me`)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Authenticated Client (Web / Mobile)
    participant API as Route Handler (/api/v1/auth/me)
    participant Service as AuthLoginService
    participant DB as PostgreSQL (users, wallets, point_accounts)

    Client->>API: GET /api/v1/auth/me (Bearer token or aw_access_token cookie)
    API->>API: Extract token from header or cookie

    alt No Token Presented
        API-->>Client: HTTP 401 Unauthorized
    else Token Present
        API->>Service: getCurrentUser(token)
        Service->>Service: verifyJwt<AccessTokenClaims>(token)
        
        alt Signature Invalid or Expired
            Service-->>API: 401 Unauthorized
            API-->>Client: HTTP 401 Unauthorized
        else Signature Valid
            Service->>DB: Query User by ID (include wallets, pointAccount, roles)
            DB-->>Service: User with balance accounts
            
            alt user.tokenVersion != claims.tokenVersion
                Note over Service: Session Kill-Switch Triggered
                Service-->>API: 401 Unauthorized ("Session has expired or credentials changed")
                API-->>Client: HTTP 401 Unauthorized
            else Valid Session
                Service-->>API: CurrentUserProfile { id, email, roles, wallets, pointAccount }
                API-->>Client: HTTP 200 OK { success: true, data: profile }
            end
        end
    end
```

---

## 4. Multi-Tenant Seller Scoping Resolution

During authentication, `AuthLoginService` evaluates user relationships to dynamically resolve merchant tenant scoping:
1. **Seller Owner**: If `user.ownedSellers.length > 0`, extracts `ownedSellers[0].id`.
2. **Seller Staff**: If `user.sellerStaff.length > 0`, extracts `sellerStaff[0].sellerId`.
3. **Role Assignment Scoping**: If `user.roleAssignments` contains a `sellerId` override, binds that tenant ID.
4. **Token Claim Injection**: The resolved `sellerId` is injected into `AccessTokenClaims.sellerId` and serialized into the signed JWT. Subsequent API gateway middleware and repositories enforce tenant boundary isolation against this claim.

---

## 5. Concurrent Session Management Policy

To protect customer wallets, reward points, and merchant store configurations from account sharing and unauthorized access:
- **Maximum Concurrent Sessions**: Configured as `TOKEN_POLICIES.MAX_ACTIVE_SESSIONS_PER_USER = 5`.
- **Enforcement**: Upon successful login, `SessionRepository.enforceSessionLimit` queries all non-revoked sessions for that user sorted by `lastActiveAt DESC`.
- **Surplus Eviction**: If active sessions > 5, surplus oldest sessions are updated to `isRevoked = true`, `revokedReason = 'EXCEEDED_MAX_CONCURRENT_SESSIONS'`.

---

## 6. REST API Contracts

### 6.1 User Login Endpoint

- **Method & Path**: `POST /api/v1/auth/login`
- **Request Body**:
  ```json
  {
    "identifier": "tanvir@example.com",
    "password": "Dhaka@Commerce#2026!",
    "clientType": "WEB",
    "deviceInfo": "MacBook Pro (Chrome 128)"
  }
  ```
- **Responses**:
  - `HTTP 200 OK`:
    ```json
    {
      "success": true,
      "data": {
        "user": {
          "id": "usr_01j7x4b9e8m02k3f8d7c6b5a1",
          "email": "tanvir@example.com",
          "phone": "+8801700112233",
          "name": "Tanvir Ahmed",
          "status": "ACTIVE",
          "isEmailVerified": true,
          "isPhoneVerified": true,
          "roles": ["CUSTOMER"],
          "permissions": ["orders:create", "orders:read"],
          "sellerId": null,
          "lastLoginAt": "2026-09-22T12:00:00.000Z"
        },
        "tokens": {
          "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "tokenType": "Bearer",
          "expiresIn": 900,
          "refreshExpiresIn": 604800
        },
        "sessionId": "ses_01j7x4b9e8m02k3f8d7c6b5a1"
      }
    }
    ```
  - `HTTP 401 Unauthorized`:
    ```json
    {
      "success": false,
      "error": {
        "code": "UNAUTHORIZED",
        "message": "Invalid email/phone or password"
      }
    }
    ```
  - `HTTP 422 Unprocessable Entity`:
    ```json
    {
      "success": false,
      "error": {
        "code": "VALIDATION_FAILED",
        "message": "Invalid login parameters"
      }
    }
    ```

### 6.2 Current User Profile Endpoint

- **Method & Path**: `GET /api/v1/auth/me`
- **Headers**: `Authorization: Bearer <token>` (or `aw_access_token` cookie)
- **Response**: `HTTP 200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "id": "usr_01j7x4b9e8m02k3f8d7c6b5a1",
      "email": "tanvir@example.com",
      "phone": "+8801700112233",
      "name": "Tanvir Ahmed",
      "avatarUrl": null,
      "status": "ACTIVE",
      "isEmailVerified": true,
      "isPhoneVerified": true,
      "roles": ["CUSTOMER"],
      "permissions": ["orders:create", "orders:read"],
      "sellerId": null,
      "wallets": [
        {
          "id": "wal_01j7x4b9e8m02k3f8d7c6b5a1",
          "type": "MAIN",
          "currency": "BDT",
          "availablePoisha": "50000",
          "pendingPoisha": "0",
          "status": "ACTIVE"
        }
      ],
      "pointAccount": {
        "id": "pac_01j7x4b9e8m02k3f8d7c6b5a1",
        "availablePoints": 450,
        "pendingPoints": 0,
        "lifetimePoints": 450
      },
      "lastLoginAt": "2026-09-22T12:00:00.000Z"
    }
  }
  ```

---

## 7. Phone-First OTP Authentication & Luxury Storefront Overlay Architecture

To match the high-end Golden Amber (`#F59E0B`) and Brand Orange (`#FF6A00`) aesthetic of the AlifWorld customer storefront, authentication is implemented via a reactive **Overlay Modal** (`AuthModal`) rather than requiring full-page navigation.

```mermaid
flowchart TD
    Start([User clicks Account / Login / Register]) --> ModalOpen[Launch AuthModal Overlay]
    
    subgraph Login Flow
        ModalOpen --> L1[Enter Mobile Number: +8801XXXXXXXXX]
        L1 --> L2{POST /api/v1/auth/phone/check}
        L2 -- Registered --> L3[Dispatch 6-Digit SMS OTP]
        L3 --> L4[Enter OTP with 60s countdown]
        L4 --> L5{POST /api/v1/auth/phone/verify-login}
        L5 -- Verified --> L6[Issue HttpOnly Cookies & Bearer Tokens]
        L6 --> L7[Instant Login & Close Overlay]
        
        L2 -- Unregistered --> LPrompt[Screen: User Not Registered]
        LPrompt --> OptA[Option A: Continue to Register with current number]
        LPrompt --> OptB[Option B: Login with another number]
        OptA --> R2[Dispatch Register OTP]
        OptB --> L1
    end
    
    subgraph Registration Wizard Flow
        R1[Enter Mobile Number] --> R2
        R2 --> R3[Enter OTP & Verify: POST /api/v1/auth/phone/verify-register]
        R3 --> R4[Issue Signed Verification Ticket]
        R4 --> R5[Step 3: First Name & Last Name]
        R5 --> R6["Step 4: Password & Confirm Password<br/>('Use this password for your next logins')"]
        R6 --> R7["Step 5 (Optional): Address, Birthday, Gender<br/>('Skip for Now' available)"]
        R7 --> R8{POST /api/v1/auth/phone/complete-registration}
        R8 --> R9[Provision 4 Segregated Wallets & PointAccount]
        R9 --> R10[Issue Tokens & Instant Login]
    end
```

### 7.1 Key Endpoints
1. `POST /api/v1/auth/phone/check`: Queries user existence by normalized Bangladesh mobile number.
2. `POST /api/v1/auth/phone/send-otp`: Dispatches 6-digit OTP with 60s cooldown and 3/hr rate limits.
3. `POST /api/v1/auth/phone/verify-login`: Verifies login OTP, creates user session, sets cookies, and returns tokens.
4. `POST /api/v1/auth/phone/verify-register`: Verifies phone ownership during registration and produces a tamper-proof HMAC verification ticket.
5. `POST /api/v1/auth/phone/complete-registration`: Atomically creates user, provisions 4 segregated wallets (`MAIN`, `SHOPPING`, `GOOD_LUCK`, `CHARITY`), assigns `CUSTOMER` role, establishes session, and returns tokens.

### 7.2 Overlay UX Highlights
- **Backdrop Blur & Smooth Step Animation**: Delicately slides between verification steps without jarring reloads.
- **Bilingual Switcher**: Instant one-click toggle between Bengali (`বাংলা`) and English.
- **Smart Phone Input**: Supports both raw `01XXXXXXXXX` and E.164 `+8801XXXXXXXXX` prefixes.
- **Password Transparency**: Explicit guidance text informs the user to remember their password for subsequent logins.
- **Frictionless Optional Demographics**: Address, division, birthday, and gender can be specified or skipped with a single click.

