# SentinelLab Enterprise Security Architecture — Threat Model (STRIDE)

## 1. Scope & System Overview
SentinelLab is an enterprise-grade Android Security Testing and Controlled Remote Support platform designed under Zero-Trust principles. The threat model systematically evaluates trust boundaries, attack vectors, threat actors, and mitigations across the entire ecosystem.

```
+-----------------------------------------------------------------------------------+
|                                 TRUST BOUNDARY 0                                  |
|  [ Android Device (Untrusted Endpoint / BYOD / Lab) ]                             |
|    - Keystore (TEE/SE) [TRUST BOUNDARY 1]                                         |
|    - Sentinel Android Agent (Foreground Service, Root Scanner)                   |
+----------------------------------------|------------------------------------------+
                                         | TLS 1.3 / WSS (ECDH ephemeral session)
                                         v
+-----------------------------------------------------------------------------------+
|                                 TRUST BOUNDARY 2                                  |
|  [ API Gateway & Ingress Reverse Proxy (Traefik / Nginx) ]                        |
|    - Rate Limiting, TLS Termination, DDoS Shield                                  |
+----------------------------------------|------------------------------------------+
                                         | Internal Network (Zero Arbitrary Exec)
                                         v
+-----------------------------------------------------------------------------------+
|                                 TRUST BOUNDARY 3                                  |
|  [ Core Application Services (NestJS Monolith / Microservices) ]                  |
|    - TenantGuard (Multi-Tenant Isolation)                                         |
|    - RolesGuard (RBAC Matrix)                                                     |
|    - CommandExecutionService (Whitelist-Only Dispatcher)                          |
+--------------------|-----------------------------------|--------------------------+
                     |                                   |
                     v                                   v
  [ PostgreSQL (Multi-Tenant DB) ]               [ Redis 7.x (Cluster / Sentinel) ]
  - Row-Level / Org UUID Partition               - Rate Limit Tokens, Short-lived Nonces
```

---

## 2. Threat Actor Profiles
1. **Malicious Insider / Rogue Support Agent**: Attempts privilege escalation, unauthorized remote screen viewing without user consent, or data extraction across tenant organizations.
2. **External Network Adversary (MITM)**: Attempts payload interception, replay of QR tokens, session hijacking, or eavesdropping on screen streams.
3. **Malicious Endpoint Application**: Co-located Android malware attempting to exploit IPC or abuse the Sentinel Agent service to obtain elevated capabilities.
4. **Tenant Compromise / Lateral Movement**: Compromised tenant user attempting to read/modify data belonging to other organizations via API tampering.

---

## 3. STRIDE Analysis & Defense Architecture

### S — Spoofing Identity
| Asset / Interface | Threat Scenario | Mitigation & Implementation |
|---|---|---|
| **API Authentication** | Stolen or forged JWT token | Dual-token model with rotating refresh tokens, Argon2id password hashing, mandatory TOTP MFA, and short JWT expiration (15m). |
| **Android Device Registration** | Rogue device spoofing serial number or hardware ID | QR Pairing protocol with ephemeral ECDH P-256 key exchange; challenge-response signed by device `AndroidKeyStore` hardware private key (`SHA256withECDSA`). |
| **Tenant Context** | Attacker injects `X-Organization-ID` header | `TenantGuard` verifies authenticated user's `user.organizationId` against request params, body, and headers. Spoofed headers trigger HTTP 403. |

---

### T — Tampering with Data
| Asset / Interface | Threat Scenario | Mitigation & Implementation |
|---|---|---|
| **Remote Commands** | Injection of arbitrary shell commands or root exploits | **Zero Arbitrary Shell Execution Principle**: CommandExecutionService strictly allows only whitelisted enum commands (`PING`, `GET_DEVICE_INFO`, `LIST_PACKAGES`, `RUN_SECURITY_AUDIT`). Rejects `EXEC_SHELL`, `SPAWN_ROOT_PROCESS`. |
| **Audit Logs** | Support agent attempts to alter remote session logs | Append-only audit log storage with HMAC signatures and immutable timestamping. |
| **QR Code Token** | Replay of intercepted QR onboarding string | QR tokens are single-use nonces stored in Redis with 5-minute TTL; atomically deleted (`DEL`) upon first consumption. Replays rejected with HTTP 401. |

---

### R — Repudiation
| Asset / Interface | Threat Scenario | Mitigation & Implementation |
|---|---|---|
| **Remote Support Session** | Agent claims session was authorized when user denies it | Dual-Consent Protocol: Session requires cryptographically signed user consent token. Every frame and command is tied to an active session ID logged with millisecond timestamps. |
| **Security Finding Modification** | Operator deletes critical vulnerability finding | Comprehensive audit trail logs operator UUID, IP address, user agent, before-and-after change diffs. |

---

### I — Information Disclosure
| Asset / Interface | Threat Scenario | Mitigation & Implementation |
|---|---|---|
| **Screen Streaming** | Eavesdropping on live device screen during support | WebRTC / WSS stream encrypted via DTLS-SRTP and TLS 1.3 with AES-256-GCM. Mandatory visual watermark overlaid on stream containing session ID and operator timestamp. |
| **Database Exposure** | SQL Injection exposing cross-tenant credentials | TypeORM parameterized queries and class-validator DTOs with `whitelist: true, forbidNonWhitelisted: true`. |
| **Android Keystore** | Malware dumps cryptographic keys from flash storage | Keys stored inside Android hardware Secure Enclave / StrongBox; private keys marked non-exportable. |

---

### D — Denial of Service
| Asset / Interface | Threat Scenario | Mitigation & Implementation |
|---|---|---|
| **API Endpoints** | Brute force login or volumetric request flooding | Redis-backed sliding-window rate limiting (`@nestjs/throttler` with Redis store). Strict payload size limits (1MB max). |
| **WebSocket Ingestion** | Flooding backend with dummy telemetry packets | Per-connection message rate limiting and payload validation against `@sentinel/validation` schemas. |

---

### E — Elevation of Privilege
| Asset / Interface | Threat Scenario | Mitigation & Implementation |
|---|---|---|
| **RBAC Bypass** | `VIEWER` or `SUPPORT_AGENT` accesses `ADMIN` routes | Global `RolesGuard` verifies JWT roles against `@Roles()` decorator. System rejects requests where role is insufficient with HTTP 403. |
| **Cross-Tenant Access** | Tenant A admin attempts to query Tenant B devices | Multi-layer tenant verification: `TenantGuard` validates route params, body tenant IDs, and database queries are scoped by `organizationId`. |
| **Android Agent Escalation** | Agent attempts to spawn root shell on rooted device | Agent operates in sandboxed user space with zero root request logic. No `su` invocation capabilities exist in source. |
