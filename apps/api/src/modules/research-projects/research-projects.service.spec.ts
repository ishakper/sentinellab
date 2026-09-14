import { NotFoundException } from '@nestjs/common';
import { ResearchProject, ResearchProjectStatus } from '../../database/entities/research-project.entity';
import { ResearchProjectsService } from './research-projects.service';

const ORG_A = '00000000-0000-0000-0000-00000000000a';
const ORG_B = '00000000-0000-0000-0000-00000000000b';
const PROJECT_ID = '10000000-0000-0000-0000-000000000001';

const project = {
  id: PROJECT_ID,
  organizationId: ORG_A,
  title: 'Lab research',
  description: 'Reserved targets only',
  institution: 'Example University',
  principalResearcher: 'Researcher',
  supervisor: 'Supervisor',
  startAt: new Date('2026-01-01T00:00:00Z'),
  endAt: new Date('2026-12-31T00:00:00Z'),
  status: ResearchProjectStatus.DRAFT,
  ethicsApprovalNumber: null,
} as ResearchProject;

describe('ResearchProjectsService tenant isolation', () => {
  const repository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve(value)),
    delete: jest.fn(),
  };
  const service = new ResearchProjectsService(repository as any);

  beforeEach(() => jest.clearAllMocks());

  it('scopes list to JWT organization', async () => {
    repository.find.mockResolvedValue([project]);
    await service.findAll(ORG_A);
    expect(repository.find).toHaveBeenCalledWith({ where: { organizationId: ORG_A }, order: { createdAt: 'DESC' } });
  });

  it('hides another tenant project on read', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.findOne(PROJECT_ID, ORG_B)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: PROJECT_ID, organizationId: ORG_B } });
  });

  it('forces create organization from JWT', async () => {
    const dto = {
      title: project.title,
      description: project.description,
      institution: project.institution,
      principalResearcher: project.principalResearcher,
      supervisor: project.supervisor,
      startAt: project.startAt.toISOString(),
      endAt: project.endAt.toISOString(),
    };
    await service.create(dto, ORG_A);
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ organizationId: ORG_A }));
  });

  it('hides another tenant project on update', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.update(PROJECT_ID, { title: 'Changed' }, ORG_B)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('scopes delete to JWT organization', async () => {
    repository.delete.mockResolvedValue({ affected: 0 });
    await expect(service.remove(PROJECT_ID, ORG_B)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.delete).toHaveBeenCalledWith({ id: PROJECT_ID, organizationId: ORG_B });
  });
});
