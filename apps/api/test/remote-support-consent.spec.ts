import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SupportService } from '../src/modules/support/support.service';
import { DeviceGateway } from '../src/modules/gateway/device.gateway';
import { AuditService } from '../src/modules/audit/audit.service';
import { SupportSession } from '../src/database/entities/support-session.entity';
import { SupportRequest } from '../src/database/entities/support-request.entity';
import { Device } from '../src/database/entities/device.entity';
import { SupportSessionStatus } from '@sentinel/shared-types';

describe('Remote Support Consent & Kill Switch Suite (Phase 11.8)', () => {
  let supportService: SupportService;
  let mockGateway: Partial<DeviceGateway>;
  let sessionStore: Map<string, any>;

  beforeAll(async () => {
    sessionStore = new Map<string, any>();

    mockGateway = {
      sendCommandToDevice: jest.fn().mockReturnValue(true),
      server: {
        emit: jest.fn(),
      } as any,
    };

    const mockSessionRepo = {
      create: jest.fn().mockImplementation((dto) => {
        const item = { id: 'sess-uuid-1', status: SupportSessionStatus.CONSENT_PENDING, ...dto };
        sessionStore.set(item.id, item);
        return item;
      }),
      save: jest.fn().mockImplementation((s) => {
        sessionStore.set(s.id, s);
        return Promise.resolve(s);
      }),
      findOne: jest.fn().mockImplementation(({ where }) => {
        const s = sessionStore.get(where.id);
        return Promise.resolve(s || null);
      }),
    };

    const mockRequestRepo = {
      create: jest.fn().mockImplementation((dto) => ({ id: 'req-uuid-1', ...dto })),
      save: jest.fn().mockImplementation((r) => Promise.resolve({ id: 'req-uuid-1', ...r })),
    };

    const mockDeviceRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'dev-uuid-1', deviceName: 'Lab Target' }),
    };

    const mockAuditService = {
      logAction: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: DeviceGateway, useValue: mockGateway },
        { provide: AuditService, useValue: mockAuditService },
        { provide: getRepositoryToken(SupportSession), useValue: mockSessionRepo },
        { provide: getRepositoryToken(SupportRequest), useValue: mockRequestRepo },
        { provide: getRepositoryToken(Device), useValue: mockDeviceRepo },
      ],
    }).compile();

    supportService = module.get<SupportService>(SupportService);
  });

  describe('Explicit Consent Handshake & Kill Switch Verification', () => {
    it('should create session in CONSENT_PENDING status when requested by agent', async () => {
      const currentUser = { id: 'agent-usr-1', email: 'agent@sentinellab.local', organizationId: 'org-1' };
      const result = await supportService.requestSession('dev-uuid-1', 'Diagnostic assistance', currentUser);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe(SupportSessionStatus.CONSENT_PENDING);
      expect(mockGateway.sendCommandToDevice).toHaveBeenCalledWith(
        'dev-uuid-1',
        expect.any(String),
        'REQUEST_SUPPORT_CONSENT',
        expect.objectContaining({ reason: 'Diagnostic assistance' }),
      );
    });

    it('should transition session to ACTIVE when device user GRANTS consent', async () => {
      const result = await supportService.grantConsent('sess-uuid-1', 'dev-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe(SupportSessionStatus.ACTIVE);
      expect(result.data.consentGrantedAt).toBeDefined();
      expect(mockGateway.server?.emit).toHaveBeenCalledWith(
        'support.consent_granted.org-1',
        expect.objectContaining({ status: SupportSessionStatus.ACTIVE }),
      );
    });

    it('should instantly terminate support session when KILL SWITCH is triggered', async () => {
      const result = await supportService.terminateSession('sess-uuid-1', 'USER');

      expect(result.success).toBe(true);
      expect(result.message).toContain('terminated by USER');

      const current = sessionStore.get('sess-uuid-1');
      expect(current.status).toBe(SupportSessionStatus.TERMINATED);
      expect(current.endedAt).toBeDefined();

      expect(mockGateway.sendCommandToDevice).toHaveBeenCalledWith(
        'dev-uuid-1',
        'sess-uuid-1',
        'TERMINATE_SUPPORT_SESSION',
        expect.objectContaining({ triggeredBy: 'USER' }),
      );
    });
  });
});
