import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PairingService } from '../src/modules/devices/pairing.service';
import { RedisService } from '../src/common/redis/redis.service';
import { Device } from '../src/database/entities/device.entity';
import { DeviceKey } from '../src/database/entities/device-key.entity';
import { DevicePairing } from '../src/database/entities/device-pairing.entity';
import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('QR Pairing E2E & Replay Defense Suite (Phase 11.6)', () => {
  let pairingService: PairingService;
  let redisStorage: Map<string, string>;

  const mockDeviceRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((dto) => ({ id: 'dev-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((device) => Promise.resolve({ id: 'dev-uuid-1', ...device })),
  };

  const mockDeviceKeyRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'key-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((key) => Promise.resolve({ id: 'key-uuid-1', ...key })),
  };

  const mockDevicePairingRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'pair-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((p) => Promise.resolve({ id: 'pair-uuid-1', ...p })),
    findOne: jest.fn().mockResolvedValue({ id: 'pair-uuid-1', status: 'PENDING' }),
  };

  beforeAll(async () => {
    redisStorage = new Map<string, string>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PairingService,
        {
          provide: RedisService,
          useValue: {
            set: jest.fn().mockImplementation((key, val) => {
              redisStorage.set(key, typeof val === 'string' ? val : JSON.stringify(val));
              return Promise.resolve('OK');
            }),
            get: jest.fn().mockImplementation((key) => {
              return Promise.resolve(redisStorage.get(key) || null);
            }),
            del: jest.fn().mockImplementation((key) => {
              redisStorage.delete(key);
              return Promise.resolve(1);
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:3001'),
          },
        },
        { provide: getRepositoryToken(Device), useValue: mockDeviceRepo },
        { provide: getRepositoryToken(DeviceKey), useValue: mockDeviceKeyRepo },
        { provide: getRepositoryToken(DevicePairing), useValue: mockDevicePairingRepo },
      ],
    }).compile();

    pairingService = module.get<PairingService>(PairingService);
  });

  beforeEach(() => {
    redisStorage.clear();
  });

  describe('Single-Use Token Lifecycle & Replay Defense', () => {
    it('should successfully generate a single-use pairing token with QR data URL', async () => {
      const orgId = '00000000-0000-0000-0000-00000000000a';
      const result = await pairingService.generatePairingToken(orgId, 'admin-usr-1');

      expect(result.success).toBe(true);
      expect(result.data.pairingToken).toBeDefined();
      expect(result.data.pairingToken.length).toBe(64); // 32 bytes hex
      expect(result.data.qrCodeDataUrl.startsWith('data:image/png;base64,')).toBe(true);

      const tokenHash = crypto.createHash('sha256').update(result.data.pairingToken).digest('hex');
      expect(redisStorage.has(`pairing_token:${tokenHash}`)).toBe(true);
    });

    it('should successfully register device on FIRST attempt with valid pairing token', async () => {
      const orgId = '00000000-0000-0000-0000-00000000000a';
      const genResult = await pairingService.generatePairingToken(orgId, 'admin-usr-1');
      const rawToken = genResult.data.pairingToken;

      const regResult = await pairingService.verifyAndRegisterDevice({
        pairingToken: rawToken,
        publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...',
        deviceName: 'Pixel 8 Lab Target',
        model: 'Pixel 8',
      });

      expect(regResult.success).toBe(true);
      expect(regResult.data.deviceId).toBe('dev-uuid-1');
      expect(regResult.data.organizationId).toBe(orgId);

      // Verify token was deleted from Redis
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      expect(redisStorage.has(`pairing_token:${tokenHash}`)).toBe(false);
    });

    it('should REJECT when attempting to REPLAY the exact same pairing token', async () => {
      const orgId = '00000000-0000-0000-0000-00000000000a';
      const genResult = await pairingService.generatePairingToken(orgId, 'admin-usr-1');
      const rawToken = genResult.data.pairingToken;

      // 1. First execution -> PASS
      await pairingService.verifyAndRegisterDevice({
        pairingToken: rawToken,
        publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...',
        deviceName: 'Pixel 8 Lab Target',
      });

      // 2. Replay execution with same token -> MUST BE REJECTED (400)
      await expect(
        pairingService.verifyAndRegisterDevice({
          pairingToken: rawToken,
          publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...',
          deviceName: 'Attacker Replay Device',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject malformed or non-existent pairing tokens', async () => {
      await expect(
        pairingService.verifyAndRegisterDevice({
          pairingToken: 'non-existent-fake-token-12345',
          publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
