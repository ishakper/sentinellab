import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { UserRole, ApiResponse, OrganizationDto } from '@sentinel/shared-types';

import { Organization } from '../../database/entities/organization.entity';
import { CreateOrganizationDto, UpdateOrganizationDto, QueryOrganizationDto } from './dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

export interface DetailedOrganizationDto extends OrganizationDto {
  userCount?: number;
  settings?: Record<string, any>;
  updatedAt?: string;
}

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
  ) {}

  private mapToDto(org: Organization, userCount?: number): DetailedOrganizationDto {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      isActive: org.isActive,
      maxDevices: org.maxDevices,
      maxUsers: org.maxUsers,
      settings: org.settings || {},
      userCount: userCount !== undefined ? userCount : undefined,
      createdAt: org.createdAt ? org.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: org.updatedAt ? org.updatedAt.toISOString() : undefined,
    };
  }

  /**
   * List organizations (SUPER_ADMIN only)
   */
  async findAll(query: QueryOrganizationDto): Promise<ApiResponse<DetailedOrganizationDto[]>> {
    const page = Math.max(1, query.page || 1);
    const perPage = Math.min(100, Math.max(1, query.perPage || 20));
    const skip = (page - 1) * perPage;

    const qb: SelectQueryBuilder<Organization> = this.orgRepository
      .createQueryBuilder('org')
      .loadRelationCountAndMap('org.userCount', 'org.users');

    if (query.isActive !== undefined) {
      qb.andWhere('org.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.search && query.search.trim().length > 0) {
      const searchTerm = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(org.name) LIKE :search OR LOWER(org.slug) LIKE :search)', {
        search: searchTerm,
      });
    }

    const allowedSortFields = ['createdAt', 'name', 'slug', 'isActive', 'maxDevices', 'maxUsers'];
    const sortBy = allowedSortFields.includes(query.sortBy || '') ? (query.sortBy as string) : 'createdAt';
    const sortOrder = (query.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    qb.orderBy(`org.${sortBy}`, sortOrder);
    qb.skip(skip).take(perPage);

    const [orgs, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / perPage);

    return {
      success: true,
      data: orgs.map((o: any) => this.mapToDto(o, o.userCount)),
      meta: {
        page,
        perPage,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get organization details by ID (Tenant isolated)
   */
  async findById(id: string, currentUser: AuthenticatedUser): Promise<ApiResponse<DetailedOrganizationDto>> {
    const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;

    // Non-super-admin can only access their own organization
    if (!isSuperAdmin && currentUser.organizationId !== id) {
      throw new ForbiddenException('Access denied: Cannot access other organizations');
    }

    const org = await this.orgRepository
      .createQueryBuilder('org')
      .loadRelationCountAndMap('org.userCount', 'org.users')
      .where('org.id = :id', { id })
      .getOne();

    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return {
      success: true,
      data: this.mapToDto(org, (org as any).userCount),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create organization (SUPER_ADMIN only)
   */
  async create(
    dto: CreateOrganizationDto,
    currentUser: AuthenticatedUser,
  ): Promise<ApiResponse<DetailedOrganizationDto>> {
    const slug = dto.slug.toLowerCase().trim();

    // Check slug collision
    const existingSlug = await this.orgRepository.findOne({ where: { slug } });
    if (existingSlug) {
      throw new ConflictException(`Organization with slug '${slug}' already exists`);
    }

    // Check name collision
    const existingName = await this.orgRepository.findOne({ where: { name: dto.name.trim() } });
    if (existingName) {
      throw new ConflictException(`Organization with name '${dto.name}' already exists`);
    }

    const org = this.orgRepository.create({
      name: dto.name.trim(),
      slug,
      isActive: true,
      maxDevices: dto.maxDevices ?? 50,
      maxUsers: dto.maxUsers ?? 10,
      settings: dto.settings || {},
    });

    const saved = await this.orgRepository.save(org);
    this.logger.log(`Organization created: "${saved.name}" (${saved.slug}) by ${currentUser.email}`);

    return {
      success: true,
      data: this.mapToDto(saved, 0),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Update organization settings (Tenant isolated or SUPER_ADMIN)
   */
  async update(
    id: string,
    dto: UpdateOrganizationDto,
    currentUser: AuthenticatedUser,
  ): Promise<ApiResponse<DetailedOrganizationDto>> {
    const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;

    // Tenant Isolation
    if (!isSuperAdmin && currentUser.organizationId !== id) {
      throw new ForbiddenException('Access denied: Cannot update another organization');
    }

    const org = await this.orgRepository
      .createQueryBuilder('org')
      .loadRelationCountAndMap('org.userCount', 'org.users')
      .where('org.id = :id', { id })
      .getOne();

    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    // Quotas and active status are platform-level parameters reserved for SUPER_ADMIN
    if (!isSuperAdmin) {
      if (dto.isActive !== undefined || dto.maxDevices !== undefined || dto.maxUsers !== undefined) {
        throw new ForbiddenException(
          'Modifying organization quotas (maxDevices, maxUsers) or active status requires super administrator privileges',
        );
      }
    } else {
      if (dto.isActive !== undefined) {
        org.isActive = dto.isActive;
      }
      if (dto.maxDevices !== undefined) {
        org.maxDevices = dto.maxDevices;
      }
      if (dto.maxUsers !== undefined) {
        org.maxUsers = dto.maxUsers;
      }
    }

    if (dto.name !== undefined) {
      org.name = dto.name.trim();
    }

    if (dto.slug !== undefined && dto.slug.toLowerCase().trim() !== org.slug) {
      const newSlug = dto.slug.toLowerCase().trim();
      const existing = await this.orgRepository.findOne({ where: { slug: newSlug } });
      if (existing && existing.id !== org.id) {
        throw new ConflictException(`Slug '${newSlug}' is already taken`);
      }
      org.slug = newSlug;
    }

    if (dto.settings !== undefined) {
      org.settings = { ...org.settings, ...dto.settings };
    }

    const saved = await this.orgRepository.save(org);
    this.logger.log(`Organization updated: "${saved.name}" (ID: ${saved.id}) by ${currentUser.email}`);

    return {
      success: true,
      data: this.mapToDto(saved, (saved as any).userCount),
      timestamp: new Date().toISOString(),
    };
  }
}
