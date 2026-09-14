# SentinelLab DevSecOps — Continuous Security Gate Specification

## 1. Overview
The SentinelLab CI/CD Security Gate automates regression detection, security policy enforcement, dependency auditing, secret scanning, and automated multi-package test execution across every pull request and trunk commit.

---

## 2. Pipeline Stages

```
   +------------------------------------------------------------------------+
   |                       PUSH / PULL REQUEST TRIGGER                      |
   +------------------------------------------------------------------------+
                                        |
        +-------------------------------+-------------------------------+
        |                               |                               |
        v                               v                               v
+-----------------------+   +-----------------------+   +-----------------------+
|  Backend & Web Gate   |   |   Android Agent Gate  |   |   Security Audit Gate |
|-----------------------|   |-----------------------|   |-----------------------|
| - Node 22 + pnpm 9    |   | - JDK 17 (Temurin)    |   | - Secret Scanner      |
| - Turborepo Build     |   | - Android SDK 35      |   | - Sensitive File Scan |
| - Root Jest Tests     |   | - Gradle Compilation  |   | - Strict Exit Code 0  |
| - API E2E & Unit Tests|   | - Static Analysis     |   |                       |
+-----------------------+   +-----------------------+   +-----------------------+
        |                               |                               |
        +-------------------------------+-------------------------------+
                                        |
                                        v
                       +---------------------------------+
                       |     SECURITY GATE PASSED        |
                       | (Branch Protection Rule Pass)   |
                       +---------------------------------+
```

---

## 3. Enforcement Policies & Zero-Tolerance Gates
1. **Zero Test Regressions**: All 49 unit, integration, and E2E security tests must pass (`exit code 0`).
2. **Zero Plaintext Secrets**: The secret scanner job halts the pipeline immediately if unmasked credentials or `.env` files are tracked in git.
3. **Android Security Standard**: Kotlin codebase compiled against Android 15 (API 35) with strict compiler warnings.
