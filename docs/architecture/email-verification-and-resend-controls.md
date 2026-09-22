# Customer Email Verification & Resend Controls Architecture Specification

## 1. Executive Summary

Milestone 033 implements the customer email verification and resend controls subsystem for AlifWorld. This specification details the end-to-end architecture governing 6-digit numeric OTP code validation, brute-force attempt limits (max 3 failed attempts), 60-second resend cooldowns, hourly rate limits (max 3 requests/hour), anti-enumeration defense, atomic database transactions, and the bilingual customer UI.

The architecture satisfies **ADR-0033**, **ADR-0022**, **ADR-0031**, and **ADR-0032**, ensuring defense against automated brute force, protection of email sending quotas, and seamless customer onboarding.

---

## 2. End-to-End Verification & Resend Workflows

### 2.1 Verification Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Buyer (Web / Mobile Flutter)
    participant API as Next.js Route Handler (/api/v1/auth/email/verify)
    participant Validator as Zod Validator (verifyEmailSchema)
    participant Service as EmailVerificationService
    participant OtpRepo as OtpRepository
    participant DB as PostgreSQL (Single Transaction)
    participant Outbox as outbox_events (BullMQ Worker)

    Customer->>API: POST /api/v1/auth/email/verify { email, code: "582914" }
    API->>Validator: Validate payload & 6-digit regex
    Validator-->>API: Validated { email, code }

    API->>Service: verifyEmail(email, code)
    Service->>Service: Find User by Email
    Service->>OtpRepo: findActiveOtp(email, 'EMAIL_VERIFICATION')
    OtpRepo-->>Service: Active OtpToken (unexpired, unused)

    alt Token Attempts >= MaxAttempts (3)
        Service->>OtpRepo: markUsed(tokenId)
        Service-->>API: 422 Unprocessable Entity (Lockout)
        API-->>Customer: HTTP 422 { error: "Too many failed attempts. Code invalidated." }
    else Code Mismatch (inputHash != tokenHash)
        Service->>OtpRepo: incrementAttempts(tokenId)
        Service-->>API: 422 Unprocessable Entity (Remaining Attempts)
        API-->>Customer: HTTP 422 { error: "Incorrect code. 2 attempts remaining." }
    else Code Matches Hash
        Note over Service,DB: BEGIN TRANSACTION
        Service->>DB: UPDATE otp_tokens SET is_used = true WHERE id = tokenId
        Service->>DB: UPDATE users SET is_email_verified = true WHERE id = userId
        Service->>DB: INSERT into audit_logs (action: 'EMAIL_VERIFIED', actorId: userId)
        Service->>DB: INSERT into outbox_events (eventType: 'auth.email_verified')
        Note over Service,DB: COMMIT TRANSACTION

        Service-->>API: VerificationResult { verified: true }
        API-->>Customer: HTTP 200 OK { success: true, message: "Email verified successfully!" }
        Note over Outbox: Outbox worker notifies downstream event handlers
    end
```

### 2.2 Resend & Rate Limiting Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Buyer (Web / Mobile Flutter)
    participant API as Next.js Route Handler (/api/v1/auth/email/resend)
    participant Validator as Zod Validator (resendVerificationSchema)
    participant Service as EmailVerificationService
    participant OtpRepo as OtpRepository
    participant DB as PostgreSQL (Single Transaction)

    Customer->>API: POST /api/v1/auth/email/resend { email }
    API->>Validator: Validate email format
    Validator-->>API: Validated email

    API->>Service: resendVerificationCode(email)
    Service->>Service: Find User by Email

    alt User Not Found
        Note over Service: Anti-Enumeration Defense
        Service-->>API: Neutral ResendResult { success: true, cooldownSeconds: 60 }
        API-->>Customer: HTTP 200 OK { message: "If an account exists, a code has been sent." }
    else User is Already Verified
        Service-->>API: ResendResult { success: true, alreadyVerified: true, cooldownSeconds: 0 }
        API-->>Customer: HTTP 200 OK { message: "Your email is already verified." }
    else Active Cooldown (< 60s since latest OTP)
        Service->>OtpRepo: getLatestOtp(email)
        OtpRepo-->>Service: latestOtp (createdAt: 25s ago)
        Service-->>API: 429 Too Many Requests (cooldownRemainingSeconds: 35)
        API-->>Customer: HTTP 429 { error: "Please wait 35 second(s)..." }
    else Hourly Rate Limit Exceeded (>= 3 requests in last hour)
        Service->>OtpRepo: getRecentOtpCount(email, 1_hour_ago)
        OtpRepo-->>Service: count = 3
        Service-->>API: 429 Too Many Requests (Hourly Limit)
        API-->>Customer: HTTP 429 { error: "Maximum resend limit reached for this hour (3 attempts)." }
    else Allowed Resend Window
        Service->>OtpRepo: invalidateActiveOtps(email)
        Service->>Service: Generate new 6-digit OTP & calculate SHA-256 hash
        Note over Service,DB: BEGIN TRANSACTION
        Service->>DB: INSERT into otp_tokens (hash, purpose, 15m TTL)
        Service->>DB: INSERT into outbox_events (auth.verification_email_resend)
        Service->>DB: INSERT into audit_logs (VERIFICATION_CODE_RESENT)
        Note over Service,DB: COMMIT TRANSACTION
        Service-->>API: ResendResult { success: true, cooldownSeconds: 60 }
        API-->>Customer: HTTP 200 OK { message: "A new 6-digit verification code has been sent." }
    end
```

---

## 3. State & Lifecycle Rules

```mermaid
stateDiagram-v2
    [*] --> ISSUED: User registered or Resend requested
    ISSUED --> ATTEMPT_FAILED: Incorrect 6-digit code entered
    ATTEMPT_FAILED --> ISSUED: attempts < 3 (remaining attempts returned)
    ATTEMPT_FAILED --> LOCKED_OUT: attempts >= 3 (token marked isUsed: true)
    ISSUED --> EXPIRED: TTL elapsed (> 15 minutes)
    ISSUED --> VERIFIED: Valid 6-digit code provided
    VERIFIED --> [*]: User.isEmailVerified = true, token isUsed = true
    LOCKED_OUT --> [*]: User must request fresh code
    EXPIRED --> [*]: User must request fresh code
```

---

## 4. Security & Cryptographic Invariants

1. **SHA-256 Token Hashing**: Ephemeral 6-digit codes are hashed via `hashToken()` (SHA-256) before persistence. Cleartext codes are never stored in the database.
2. **Brute Force Defense**: With 10^6 code combinations, a 3-attempt ceiling restricts the attack probability per code to 0.0003% (3 in 1,000,000).
3. **Anti-Enumeration Neutral Envelope**: `resendVerificationCode` returns an identical success envelope with a 60-second cooldown whether or not the account exists.
4. **Strict Cooldown Enforcement**: Prevents rapid automated API requests by enforcing 60 seconds between OTP generations per identifier.
5. **Hourly Ceiling (Cost and Spam Protection)**: Prevents email fatigue and malicious resource consumption by locking resends at 3 per rolling hour.
6. **Atomic Transaction**: Ensures `isEmailVerified` cannot be set without consuming the OTP token, recording an audit log, and emitting an outbox event.

---

## 5. REST API Specifications

### 5.1 Verify Email Endpoint

- **Method & Route**: `POST /api/v1/auth/email/verify`
- **Request Body**:
  ```json
  {
    "email": "tanvir@example.com",
    "code": "582914"
  }
  ```
- **Responses**:
  - `HTTP 200 OK`:
    ```json
    {
      "success": true,
      "data": {
        "verified": true,
        "email": "tanvir@example.com",
        "userId": "usr_01j7x4b9e8m02k3f8d7c6b5a1",
        "message": "Email verified successfully! You can now log in to your AlifWorld account."
      }
    }
    ```
  - `HTTP 422 Unprocessable Entity` (Wrong code with attempts remaining):
    ```json
    {
      "success": false,
      "error": {
        "code": "VALIDATION_FAILED",
        "message": "Incorrect verification code. You have 2 attempt(s) remaining.",
        "details": { "remainingAttempts": 2 }
      }
    }
    ```
  - `HTTP 422 Unprocessable Entity` (Max attempts reached / Lockout):
    ```json
    {
      "success": false,
      "error": {
        "code": "VALIDATION_FAILED",
        "message": "Incorrect verification code. Maximum attempts reached. Please request a new code.",
        "details": { "remainingAttempts": 0 }
      }
    }
    ```

### 5.2 Resend Verification Endpoint

- **Method & Route**: `POST /api/v1/auth/email/resend`
- **Request Body**:
  ```json
  {
    "email": "tanvir@example.com"
  }
  ```
- **Responses**:
  - `HTTP 200 OK`:
    ```json
    {
      "success": true,
      "data": {
        "success": true,
        "message": "A new 6-digit verification code has been sent to your email.",
        "cooldownSeconds": 60
      }
    }
    ```
  - `HTTP 429 Too Many Requests` (Active cooldown):
    ```json
    {
      "success": false,
      "error": {
        "code": "VALIDATION_FAILED",
        "message": "Please wait 42 second(s) before requesting another code.",
        "details": { "cooldownRemainingSeconds": 42 }
      }
    }
    ```
  - `HTTP 429 Too Many Requests` (Hourly limit):
    ```json
    {
      "success": false,
      "error": {
        "code": "VALIDATION_FAILED",
        "message": "Maximum resend limit reached for this hour (3 attempts). Please try again later or contact support.",
        "details": { "maxPerHour": 3 }
      }
    }
    ```

---

## 6. Bilingual Storefront Interface (`/verify-email`)

The verification interface is built as a dark-theme, responsive Next.js client component:
- **6-Digit PIN Input**: Renders 6 separate inputs with single-digit masking, automatic focus shift on typing, and backwards focus shift on backspace.
- **Clipboard Handling**: Detects paste events on any of the cells, extracts first 6 numeric characters, distributes them across inputs, and shifts focus to the final input cell.
- **Interactive 60s Countdown Timer**: Tracks remaining cooldown seconds in real-time, disabling the Resend button until the countdown completes.
- **Bilingual Localization**: Supports instant toggling between Bengali (`bn-BD`) and English (`en-BD`) with localized copy, labels, and error messages.
- **Visual Feedback**: Outlines invalid inputs in red on failure, animates loading spinners during verification, and shows a celebratory green success card redirecting to the login screen.
