# SentinelLab Security Controls Matrix & Standards Compliance

## 1. Compliance Standards Mapping
This matrix establishes formal alignment between SentinelLab implementation components and industry security baselines:
- **OWASP MASVS** (Mobile Application Security Verification Standard v2.0)
- **OWASP ASVS** (Application Security Verification Standard v4.0)
- **NIST SP 800-53 Rev. 5** (Security and Privacy Controls for Information Systems)

---

## 2. Mobile Agent Security Controls (OWASP MASVS)

| MASVS Category | Control Identifier | Requirement Description | SentinelLab Implementation | Verification Status |
|---|---|---|---|---|
| **MASVS-CRYPTO** | MASVS-CRYPTO-1 | Use proven cryptographic primitives and secure key storage | `KeystoreManager.kt` generates EC P-256 keys inside `AndroidKeyStore`. NIST P-256 + SHA256withECDSA for challenge signatures. | **VERIFIED** |
| **MASVS-AUTH** | MASVS-AUTH-1 | Hardware-backed authentication for device enrollment | QR pairing protocol exchanges ECDH ephemeral public keys and authenticates device identity via signed challenge. | **VERIFIED** |
| **MASVS-NETWORK** | MASVS-NETWORK-1 | TLS 1.3 encryption for all network communications | OkHttp & Retrofit configured with TLS 1.3 and Certificate Pinning support. All WebSockets run over WSS. | **VERIFIED** |
| **MASVS-PLATFORM** | MASVS-PLATFORM-1 | Scoped permissions and component isolation | `android:exported="false"` on internal services, `android:allowBackup="false"`, runtime permission checks. | **VERIFIED** |
| **MASVS-RESILIENCE**| MASVS-RESILIENCE-1 | Detection of root / compromised environment | `SecurityPostureAuditor.kt` detects `su` binaries, test-keys, Magisk/SuperSU and reports posture to dashboard. | **VERIFIED** |
| **MASVS-PRIVACY** | MASVS-PRIVACY-1 | Explicit user consent and visual indicators for screen capture | `RemoteSupportForegroundService.kt` operates `mediaProjection` with ongoing notification, visual watermark, and kill-switch. | **VERIFIED** |

---

## 3. Backend & API Security Controls (OWASP ASVS & NIST)

| Standard | Control ID | Control Name | SentinelLab Implementation | Verification Suite |
|---|---|---|---|---|
| **ASVS V2** | 2.1.1 | Password Storage | Argon2id hashing via `@sentinel/crypto-core` / `Argon2Service`. | `auth-rbac.integration.spec.ts` |
| **ASVS V2** | 2.8.1 | Multi-Factor Auth | RFC 6238 TOTP with QR provisioning and time-window verification. | `auth-rbac.integration.spec.ts` |
| **ASVS V3** | 3.5.1 | Refresh Token Rotation | Rotating refresh tokens with family tracking and automatic replay revocation. | `auth-rbac.integration.spec.ts` |
| **ASVS V4** | 4.1.1 | Role-Based Access Control | `@Roles()` decorator and `RolesGuard` enforcing SuperAdmin, Admin, Support Agent, Auditor, Viewer. | `auth-rbac.integration.spec.ts` |
| **ASVS V4** | 4.2.1 | Multi-Tenant Data Isolation | `TenantGuard` verifying route `:organizationId`, request payload, and header scoping. | `tenant-isolation.e2e-spec.ts` |
| **ASVS V5** | 5.1.1 | Input Validation & Sanitization | `class-validator` DTOs with `whitelist: true, forbidNonWhitelisted: true`. | `validation.spec.ts` |
| **ASVS V5** | 5.3.1 | Injection & Command Safety | Strict Enum Command Dispatcher: **Zero Arbitrary Shell Execution**; rejects `EXEC_SHELL`. | `websocket-commands.spec.ts` |
| **NIST 800-53** | AC-3 | Access Enforcement | Global Guard Pipeline: `JwtAuthGuard -> TenantGuard -> RolesGuard`. | Root & API test suites |
| **NIST 800-53** | AU-2 | Audit Logging | Immutable audit logging service recording all operator actions and remote sessions. | Audit module |
| **NIST 800-53** | SC-13 | Cryptographic Protection | AES-256-GCM symmetric encryption and ECDH P-256 key exchange via Node `crypto`. | `crypto-core.spec.ts` |

---

## 4. Controlled Remote Support Safety Invariants
1. **Consent Primacy**: No remote support session can initiate without a user consent response.
2. **Session Transience**: Sessions expire automatically after predefined idle timeout.
3. **Audit Immutability**: Every frame and command execution is logged with operator metadata.
4. **Command Containment**: Support agents cannot execute arbitrary terminal commands or install unapproved packages.
