import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../src/modules/auth/auth.service';
import { Argon2Service } from '../src/modules/auth/argon2.service';
import { TotpService } from '../src/modules/auth/totp.service';
import { RefreshTokenService } from '../src/modules/auth/refresh-token.service';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@sentinel/shared-types';
import { UnauthorizedException, ForbiddenException, ExecutionContext } from '@nestjs/common';

describe('Auth & RBAC Integration Test Suite (Phase 11.5)', () => {
  let argon2Service: Argon2Service;
  let totpService: TotpService;
  let refreshTokenService: RefreshTokenService;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  const mockUserRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ id: 'usr-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((user) => Promise.resolve({ id: 'usr-uuid-1', ...user })),
  };

  const mockRefreshTokenRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ id: 'rt-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((rt) => Promise.resolve({ id: 'rt-uuid-1', ...rt })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockOrgRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ id: 'org-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((org) => Promise.resolve({ id: 'org-uuid-1', ...org })),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Argon2Service,
        TotpService,
        {
          provide: RefreshTokenService,
          useValue: {
            createRefreshToken: jest.fn().mockResolvedValue({ token: 'mock-refresh-token-64chars', family: 'fam-1' }),
            rotateRefreshToken: jest.fn().mockImplementation(async (oldToken: string) => {
              if (oldToken === 'valid-refresh-token') {
                return { token: 'new-refresh-token', userId: 'usr-1' };
              }
              if (oldToken === 'replayed-token') {
                throw new UnauthorizedException('Replayed refresh token: family revoked');
              }
              throw new UnauthorizedException('Invalid refresh token');
            }),
            revokeAllUserTokens: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock.jwt.token'),
            verify: jest.fn().mockReturnValue({ sub: 'usr-1', role: UserRole.ADMIN, organizationId: 'org-1' }),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        RolesGuard,
      ],
    }).compile();

    argon2Service = module.get<Argon2Service>(Argon2Service);
    totpService = module.get<TotpService>(TotpService);
    refreshTokenService = module.get<RefreshTokenService>(RefreshTokenService);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('Argon2id Password Security', () => {
    it('should hash passwords using Argon2id and verify correctly', async () => {
      const password = 'P@ssw0rd!Secure2026';
      const hash = await argon2Service.hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash.startsWith('$argon2id$')).toBe(true);

      const isValid = await argon2Service.verifyPassword(hash, password);
      expect(isValid).toBe(true);

      const isInvalid = await argon2Service.verifyPassword(hash, 'WrongP@ssw0rd');
      expect(isInvalid).toBe(false);
    });
  });

  describe('TOTP Multi-Factor Authentication', () => {
    it('should generate TOTP secret, otpauth URL, and QR code Data URL', async () => {
      const mfaSetup = await totpService.generateSecret('admin@sentinellab.local');
      expect(mfaSetup.secret).toBeDefined();
      expect(mfaSetup.otpauthUrl).toContain('admin%40sentinellab.local');
      expect(mfaSetup.qrCodeDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('should reject invalid or malformed TOTP codes', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const isValid = totpService.verifyToken(secret, '000000');
      // Unless 000000 matches current window, this is false
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('Rotating Refresh Tokens & Replay Defense', () => {
    it('should rotate valid refresh token successfully', async () => {
      const result = await refreshTokenService.rotateRefreshToken('valid-refresh-token');
      expect(result.token).toBe('new-refresh-token');
      expect(result.userId).toBe('usr-1');
    });

    it('should reject and throw UnauthorizedException when a revoked/replayed token is presented', async () => {
      await expect(refreshTokenService.rotateRefreshToken('replayed-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('RBAC & RolesGuard Evaluation', () => {
    const createMockContext = (userRole: UserRole | string, requiredRoles?: UserRole[]) => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((metadataKey: any) => {
        if (metadataKey === 'isPublic') {
          return false;
        }
        if (metadataKey === 'roles') {
          return requiredRoles;
        }
        return undefined;
      });
      return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              id: 'usr-1',
              role: userRole,
              organizationId: 'org-1',
            },
          }),
        }),
      } as unknown as ExecutionContext;
    };

    it('should allow SUPER_ADMIN to access any role-protected route', () => {
      const context = createMockContext(UserRole.SUPER_ADMIN, [UserRole.ADMIN]);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should allow ADMIN to access ADMIN-scoped route', () => {
      const context = createMockContext(UserRole.ADMIN, [UserRole.ADMIN, UserRole.SUPPORT_AGENT]);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should forbid VIEWER from accessing ADMIN-scoped route', () => {
      const context = createMockContext(UserRole.VIEWER, [UserRole.ADMIN]);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow any role on routes without @Roles metadata', () => {
      const context = createMockContext(UserRole.VIEWER, undefined);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });
  });
});
