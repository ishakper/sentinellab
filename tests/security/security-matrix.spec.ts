import { HashUtils } from '@sentinel/crypto-core';
import { VulnerabilitySeverity, SecurityEventType, AuditAction } from '@sentinel/shared-types';

describe('Security Matrix & Threat Enums Suite (Root Suite)', () => {
  describe('Path Traversal & Sanitization Checks', () => {
    it('should detect path traversal attack sequences', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '/var/data/../../etc/shadow',
      ];

      for (const p of maliciousPaths) {
        const hasTraversal = p.includes('../') || p.includes('..\\');
        expect(hasTraversal).toBe(true);
      }
    });

    it('should allow legitimate clean relative paths', () => {
      const safePath = 'uploads/evidence/screen-capture-1.png';
      const hasTraversal = safePath.includes('../') || safePath.includes('..\\');
      expect(hasTraversal).toBe(false);
    });
  });

  describe('Security Event & Anomaly Types', () => {
    it('should define critical security anomaly event types', () => {
      expect(SecurityEventType.FAILED_LOGIN_THRESHOLD).toBe('FAILED_LOGIN_THRESHOLD');
      expect(SecurityEventType.PAIRING_REPLAY_ATTEMPT).toBe('PAIRING_REPLAY_ATTEMPT');
      expect(SecurityEventType.INVALID_DEVICE_SIGNATURE).toBe('INVALID_DEVICE_SIGNATURE');
      expect(SecurityEventType.UNAUTHORIZED_RESOURCE_ACCESS).toBe('UNAUTHORIZED_RESOURCE_ACCESS');
    });

    it('should define strict audit action constants', () => {
      expect(AuditAction.DEVICE_PAIR).toBe('DEVICE_PAIR');
      expect(AuditAction.DEVICE_UNPAIR).toBe('DEVICE_UNPAIR');
      expect(AuditAction.SUPPORT_SESSION_START).toBe('SUPPORT_SESSION_START');
      expect(AuditAction.SUPPORT_SESSION_END).toBe('SUPPORT_SESSION_END');
    });
  });
});
