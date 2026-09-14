import { loginSchema, registerSchema, createDeviceSchema } from '@sentinel/validation';
import { UserRole } from '@sentinel/shared-types';

describe('Auth & RBAC Schema Validation Tests (Root Suite)', () => {
  describe('Login Validation Schema', () => {
    it('should accept valid login payload', () => {
      const payload = {
        email: 'admin@sentinellab.local',
        password: 'SecurePassword123!',
      };
      const result = loginSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const payload = {
        email: 'invalid-email-string',
        password: 'SecurePassword123!',
      };
      const result = loginSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('Registration Validation Schema', () => {
    it('should validate complete registration payload', () => {
      const payload = {
        email: 'developer@sentinellab.local',
        password: 'ComplexPassword!2026',
        firstName: 'Security',
        lastName: 'Engineer',
      };
      const result = registerSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('Role Hierarchy & Privilege Definition', () => {
    it('should maintain defined platform user roles', () => {
      expect(UserRole.SUPER_ADMIN).toBe('SUPER_ADMIN');
      expect(UserRole.ADMIN).toBe('ADMIN');
      expect(UserRole.SUPPORT_AGENT).toBe('SUPPORT_AGENT');
      expect(UserRole.VIEWER).toBe('VIEWER');
    });
  });
});
