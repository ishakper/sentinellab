import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommandExecutionService } from '../src/modules/gateway/command-execution.service';
import { DeviceGateway } from '../src/modules/gateway/device.gateway';
import { RedisService } from '../src/common/redis/redis.service';
import { Command } from '../src/database/entities/command.entity';
import { CommandResult } from '../src/database/entities/command-result.entity';
import { CommandType } from '@sentinel/shared-types';
import { BadRequestException } from '@nestjs/common';

describe('WebSocket Safe Commands & Zero Shell Execution Suite (Phase 11.7)', () => {
  let commandExecutionService: CommandExecutionService;
  let mockGateway: Partial<DeviceGateway>;

  const mockCommandRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'cmd-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((c) => Promise.resolve({ id: 'cmd-uuid-1', ...c })),
    findOne: jest.fn().mockResolvedValue({ id: 'cmd-uuid-1', deviceId: 'dev-1', organizationId: 'org-1' }),
  };

  const mockCommandResultRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'res-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((r) => Promise.resolve({ id: 'res-uuid-1', ...r })),
  };

  beforeAll(async () => {
    mockGateway = {
      sendCommandToDevice: jest.fn().mockReturnValue(true),
      server: {
        emit: jest.fn(),
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandExecutionService,
        {
          provide: DeviceGateway,
          useValue: mockGateway,
        },
        {
          provide: RedisService,
          useValue: {
            set: jest.fn().mockResolvedValue('OK'),
            del: jest.fn().mockResolvedValue(1),
          },
        },
        { provide: getRepositoryToken(Command), useValue: mockCommandRepo },
        { provide: getRepositoryToken(CommandResult), useValue: mockCommandResultRepo },
      ],
    }).compile();

    commandExecutionService = module.get<CommandExecutionService>(CommandExecutionService);
  });

  describe('Predefined Safe Commands Allowlist Enforcement', () => {
    it('should ALLOW valid allowlisted command GET_DEVICE_INFO', async () => {
      const result = await commandExecutionService.issueCommand(
        'dev-1',
        CommandType.GET_DEVICE_INFO,
        {},
        'admin-usr-1',
        'org-1',
      );

      expect(result).toBeDefined();
      expect(result.type).toBe(CommandType.GET_DEVICE_INFO);
      expect(mockGateway.sendCommandToDevice).toHaveBeenCalled();
    });

    it('should ALLOW valid allowlisted command PING', async () => {
      const result = await commandExecutionService.issueCommand(
        'dev-1',
        CommandType.PING,
        {},
        'admin-usr-1',
        'org-1',
      );

      expect(result).toBeDefined();
      expect(result.type).toBe(CommandType.PING);
    });

    it('should REJECT arbitrary shell execution attempts (rm -rf / sh -c)', async () => {
      const maliciousShellCommand = 'EXEC_SHELL' as any;

      await expect(
        commandExecutionService.issueCommand(
          'dev-1',
          maliciousShellCommand,
          { command: 'cat /etc/passwd' },
          'admin-usr-1',
          'org-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT binary execution / root exploit commands', async () => {
      const exploitCommand = 'SPAWN_ROOT_PROCESS' as any;

      await expect(
        commandExecutionService.issueCommand(
          'dev-1',
          exploitCommand,
          { binary: '/system/bin/su' },
          'admin-usr-1',
          'org-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
