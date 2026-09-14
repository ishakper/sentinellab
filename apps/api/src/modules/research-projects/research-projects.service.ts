import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResearchProject } from '../../database/entities/research-project.entity';
import { CreateResearchProjectDto, UpdateResearchProjectDto } from './dto';

@Injectable()
export class ResearchProjectsService {
  constructor(
    @InjectRepository(ResearchProject)
    private readonly researchProjectsRepository: Repository<ResearchProject>,
  ) {}

  findAll(organizationId: string): Promise<ResearchProject[]> {
    return this.researchProjectsRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<ResearchProject> {
    const project = await this.researchProjectsRepository.findOne({ where: { id, organizationId } });
    if (!project) throw new NotFoundException(`Research project with ID ${id} not found`);
    return project;
  }

  async create(dto: CreateResearchProjectDto, organizationId: string): Promise<ResearchProject> {
    this.validatePeriod(dto.startAt, dto.endAt);
    const project = this.researchProjectsRepository.create({
      ...dto,
      organizationId,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      ethicsApprovalNumber: dto.ethicsApprovalNumber ?? null,
    });
    return this.researchProjectsRepository.save(project);
  }

  async update(id: string, dto: UpdateResearchProjectDto, organizationId: string): Promise<ResearchProject> {
    const project = await this.findOne(id, organizationId);
    const startAt = dto.startAt ? new Date(dto.startAt) : project.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : project.endAt;
    this.validatePeriod(startAt, endAt);
    Object.assign(project, dto, { startAt, endAt });
    return this.researchProjectsRepository.save(project);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const result = await this.researchProjectsRepository.delete({ id, organizationId });
    if (!result.affected) throw new NotFoundException(`Research project with ID ${id} not found`);
  }

  private validatePeriod(startAt: string | Date, endAt: string | Date): void {
    if (new Date(endAt).getTime() < new Date(startAt).getTime()) {
      throw new BadRequestException('endAt must be on or after startAt');
    }
  }
}
