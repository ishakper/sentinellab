import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, isAbsolute, relative, resolve } from 'path';
import { Repository } from 'typeorm';
import { AuthorizationRecord } from '../../database/entities/authorization-record.entity';
import { ResearchProject } from '../../database/entities/research-project.entity';
import { CreateAuthorizationRecordDto } from './dto/create-authorization-record.dto';
import { UpdateAuthorizationRecordDto } from './dto/update-authorization-record.dto';

export interface UploadedDocument {
  buffer: Buffer;
  originalname?: string;
}

@Injectable()
export class AuthorizationRecordsService {
  constructor(
    @InjectRepository(AuthorizationRecord)
    private readonly authorizationRecordsRepository: Repository<AuthorizationRecord>,
    @InjectRepository(ResearchProject)
    private readonly researchProjectsRepository: Repository<ResearchProject>,
    private readonly configService: ConfigService,
  ) {}

  findAll(organizationId: string): Promise<AuthorizationRecord[]> {
    return this.authorizationRecordsRepository
      .createQueryBuilder('authorization')
      .innerJoin('authorization.researchProject', 'project')
      .where('project.organizationId = :organizationId', { organizationId })
      .orderBy('authorization.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string, organizationId: string): Promise<AuthorizationRecord> {
    const record = await this.authorizationRecordsRepository
      .createQueryBuilder('authorization')
      .innerJoin('authorization.researchProject', 'project')
      .where('authorization.id = :id', { id })
      .andWhere('project.organizationId = :organizationId', { organizationId })
      .getOne();
    if (!record) throw new NotFoundException(`Authorization record with ID ${id} not found`);
    return record;
  }

  async upload(
    dto: CreateAuthorizationRecordDto,
    file: UploadedDocument | undefined,
    organizationId: string,
  ): Promise<AuthorizationRecord> {
    if (!file?.buffer?.length) throw new BadRequestException('Document file is required');
    await this.requireProject(dto.researchProjectId, organizationId);
    this.validatePeriod(dto.validFrom, dto.validUntil);

    const uploadDir = resolve(this.configService.get<string>('UPLOAD_DIR', './uploads'));
    const suffix = extname(file.originalname ?? '').toLowerCase().replace(/[^.a-z0-9]/g, '');
    const filename = `${randomUUID()}${suffix}`;
    const documentPath = resolve(uploadDir, filename);
    const relativePath = relative(uploadDir, documentPath);
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new BadRequestException('Invalid upload path');
    }

    await mkdir(uploadDir, { recursive: true });
    await writeFile(documentPath, file.buffer, { flag: 'wx' });
    const record = this.authorizationRecordsRepository.create({
      ...dto,
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
      documentPath,
      documentHash: createHash('sha256').update(file.buffer).digest('hex'),
    });
    try {
      return await this.authorizationRecordsRepository.save(record);
    } catch (error) {
      await unlink(documentPath).catch(() => undefined);
      throw error;
    }
  }

  async update(id: string, dto: UpdateAuthorizationRecordDto, organizationId: string): Promise<AuthorizationRecord> {
    const record = await this.findOne(id, organizationId);
    const validFrom = dto.validFrom ? new Date(dto.validFrom) : record.validFrom;
    const validUntil = dto.validUntil ? new Date(dto.validUntil) : record.validUntil;
    this.validatePeriod(validFrom, validUntil);
    Object.assign(record, dto, { validFrom, validUntil });
    return this.authorizationRecordsRepository.save(record);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const record = await this.findOne(id, organizationId);
    await this.authorizationRecordsRepository.remove(record);
  }

  private async requireProject(id: string, organizationId: string): Promise<void> {
    const project = await this.researchProjectsRepository.findOne({ where: { id, organizationId } });
    if (!project) throw new NotFoundException(`Research project with ID ${id} not found`);
  }

  private validatePeriod(validFrom: string | Date, validUntil: string | Date): void {
    if (new Date(validUntil).getTime() < new Date(validFrom).getTime()) {
      throw new BadRequestException('validUntil must be on or after validFrom');
    }
  }
}
