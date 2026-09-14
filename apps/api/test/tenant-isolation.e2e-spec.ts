import { Test, TestingModule } from '@nestjs/testing';
import { TenantGuard } from '../src/common/guards/tenant.guard';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@sentinel/shared-types';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';

describe('Tenant Isolation E2E Security Suite (Phase 11.4)', () => {
  let tenantGuard: TenantGuard;
  let reflector: Reflector;

  const ORG_A_ID = '00000000-0000-0000-0000-00000000000a';
  const ORG_B_ID = '00000000-0000-0000-0000-00000000000b';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn().mockReturnValue(false),
          },
        },
      ],
    }).compile();

    tenantGuard = module.get<TenantGuard>(TenantGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const createTenantContext = (options: {
    userRole: UserRole;
    userOrgId: string | null;
    params?: Record<string, string>;
    headers?: Record<string, string>;
    body?: Record<string, any>;
    query?: Record<string, string>;
    method?: string;
  }) => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: 'usr-test-1',
            role: options.userRole,
            organizationId: options.userOrgId,
          },
          params: options.params || {},
          headers: options.headers || {},
          body: options.body || {},
          query: options.query || {},
          method: options.method || (options.body ? 'POST' : 'GET'),
        }),
      }),
    } as unknown as ExecutionContext;
  };

  describe('Strict Boundary Enforcement (ORG-A vs ORG-B)', () => {
    it('should ALLOW ORG-A user to access ORG-A resources', () => {
      const context = createTenantContext({
        userRole: UserRole.ADMIN,
        userOrgId: ORG_A_ID,
        params: { organizationId: ORG_A_ID },
      });
      expect(tenantGuard.canActivate(context)).toBe(true);
    });

    it('should DENY ORG-A user accessing ORG-B resources via route params (403)', () => {
      const context = createTenantContext({
        userRole: UserRole.ADMIN,
        userOrgId: ORG_A_ID,
        params: { organizationId: ORG_B_ID },
      });
      expect(() => tenantGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY ORG-B user accessing ORG-A resources via route params (403)', () => {
      const context = createTenantContext({
        userRole: UserRole.ADMIN,
        userOrgId: ORG_B_ID,
        params: { organizationId: ORG_A_ID },
      });
      expect(() => tenantGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY cross-tenant mutation via request body payload (403)', () => {
      const context = createTenantContext({
        userRole: UserRole.ADMIN,
        userOrgId: ORG_A_ID,
        body: { organizationId: ORG_B_ID, deviceName: 'Malicious Injected Device' },
      });
      expect(() => tenantGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY cross-tenant access via X-Organization-ID header spoofing (403)', () => {
      const context = createTenantContext({
        userRole: UserRole.ADMIN,
        userOrgId: ORG_A_ID,
        headers: { 'x-organization-id': ORG_B_ID },
      });
      expect(() => tenantGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should ALLOW SUPER_ADMIN to bypass tenant barriers for cross-tenant administration', () => {
      const contextA = createTenantContext({
        userRole: UserRole.SUPER_ADMIN,
        userOrgId: null,
        params: { organizationId: ORG_A_ID },
      });
      expect(tenantGuard.canActivate(contextA)).toBe(true);

      const contextB = createTenantContext({
        userRole: UserRole.SUPER_ADMIN,
        userOrgId: null,
        params: { organizationId: ORG_B_ID },
      });
      expect(tenantGuard.canActivate(contextB)).toBe(true);
    });
  });
});
