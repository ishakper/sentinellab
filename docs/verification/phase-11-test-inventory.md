# Phase 11 Test Inventory & Test Architecture Report
**Document:** `docs/verification/phase-11-test-inventory.md`  
**Generated:** 2026-09-08  
**Scope:** Repository-wide test suite analysis, gap detection, and test infrastructure blueprint.

---

## 1. Existing Test Inventory

| File Path | Scope / Level | Target Component | Status Before Repair | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| `apps/api/src/modules/health/health.controller.spec.ts` | Unit Test | `HealthController`, `HealthService` | **PASSING (4/4)** | Maintain |
| `tests/unit/crypto-core.spec.ts` | Unit Test | `@sentinel/crypto-core` (`ChallengeResponseService`, `SignatureVerifier`, `TokenGenerator`, `HashUtils`) | **BROKEN IMPORTS** | Align method names with `@sentinel/crypto-core` exports |
| `tests/integration/auth-rbac.integration.spec.ts` | Integration Test | Argon2id Auth, TOTP MFA, JWT rotation, RBAC Roles | **BROKEN IMPORTS** (Missing `../../src/app`) | Refactor to use NestJS `Test.createTestingModule` & `INestApplication` |
| `tests/security/security-matrix.spec.ts` | Security E2E | IDOR/BOLA, Replay Attack rejection, Sliding Window Rate Limiter, Path Traversal | **BROKEN IMPORTS** (Missing `../../src/app`) | Refactor to use NestJS `Test.createTestingModule` & SentinelLab API routes |

---

## 2. Test Architecture Strategy

1. **Unit Testing:**
   - Package-level unit tests for `@sentinel/crypto-core` and `@sentinel/validation`.
   - Controller & Service unit testing in `apps/api`.
2. **Integration Testing (`@nestjs/testing`):**
   - In-memory / Mock-isolated NestJS integration testing covering `AuthService`, `UsersService`, `OrganizationsService`, `RolesGuard`, and `TenantGuard`.
   - Complete verification of multi-tenant isolation, JWT rotation, and TOTP MFA flows.
3. **Security Testing (E2E):**
   - Tenant isolation barrier tests (`ORG-A` vs `ORG-B`).
   - Replay protection for single-use pairing tokens (`PairingService`).
   - Predefined command allowlist & zero arbitrary shell execution (`CommandExecutionService`).
   - Support session consent lifecycle and instant kill switch (`SupportService`).
