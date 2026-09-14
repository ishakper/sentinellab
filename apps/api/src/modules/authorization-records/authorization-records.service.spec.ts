import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { AuthorizationRecordStatus } from '../../database/entities/authorization-record.entity';
import { AuthorizationRecordsService } from './authorization-records.service';

const ORG_A = '00000000-0000-4000-8000-00000000000a';
const ORG_B = '00000000-0000-4000-8000-00000000000b';
const PROJECT_ID = '10000000-0000-4000-8000-000000000001';

const dto = {
  researchProjectId: PROJECT_ID,
  assetOwner: 'Example University',
  authorizedBy: 'Supervisor',
  validFrom: '2026-01-01T00:00:00.000Z',
  validUntil: '2026-12-31T00:00:00.000Z',
  approvedTargets: ['example.com'],
  prohibitedActions: ['credential dumping'],
  status: AuthorizationRecordStatus.APPROVED,
};

describe('AuthorizationRecordsService', () => {
  let uploadDir: string;
  const authorizationRepository = {
    createQueryBuilder: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve(value)),
    remove: jest.fn(),
  };
  const projectRepository = { findOne: jest.fn() };
  let service: AuthorizationRecordsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    uploadDir = await mkdtemp(join(tmpdir(), 'sentinellab-auth-'));
    service = new AuthorizationRecordsService(
      authorizationRepository as any,
      projectRepository as any,
      new ConfigService({ UPLOAD_DIR: uploadDir }),
    );
  });

  afterEach(() => rm(uploadDir, { recursive: true, force: true }));

  it('rejects missing or cross-tenant research project before writing', async () => {
    projectRepository.findOne.mockResolvedValue(null);

    await expect(service.upload(dto, { buffer: Buffer.from('authorization') }, ORG_B)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(projectRepository.findOne).toHaveBeenCalledWith({ where: { id: PROJECT_ID, organizationId: ORG_B } });
    expect(authorizationRepository.save).not.toHaveBeenCalled();
  });

  it('stores exact uploaded bytes and matching SHA-256 hash', async () => {
    const bytes = Buffer.from('approved authorization document\n', 'utf8');
    projectRepository.findOne.mockResolvedValue({ id: PROJECT_ID, organizationId: ORG_A });

    const saved = await service.upload(dto, { buffer: bytes, originalname: '../../authorization.pdf' }, ORG_A);

    expect(saved.documentHash).toBe(createHash('sha256').update(bytes).digest('hex'));
    await expect(readFile(saved.documentPath)).resolves.toEqual(bytes);
    expect(saved.documentPath.startsWith(uploadDir)).toBe(true);
  });
});
