import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import * as argon2 from 'argon2';
import { UserRole } from '@sentinel/shared-types';
import { User } from '../../database/entities/user.entity';
import { Organization } from '../../database/entities/organization.entity';
import { RefreshTokenService } from '../auth/refresh-token.service';

export interface AuthenticatedUserPayload {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
}

export interface QueryUserParams {
  page?: number;
  perPage?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  organizationId?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  organizationId?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async findAll(query: QueryUserParams, currentUser: AuthenticatedUserPayload) {
    const page = Math.max(1, query.page || 1);
    const perPage = Math.min(100, Math.max(1, query.perPage || 20));
    const skip = (page - 1) * perPage;

    const qb: SelectQueryBuilder<User> = this.userRepository.createQueryBuilder('user');
    qb.leftJoinAndSelect('user.organization', 'organization');

    const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;

    if (isSuperAdmin) {
      if (query.organizationId) {
        qb.andWhere('user.organizationId = :orgId', { orgId: query.organizationId });
      }
    } else {
      if (!currentUser.organizationId) {
        throw new ForbiddenException('User is not associated with an organization');
      }
      qb.andWhere('user.organizationId = :orgId', { orgId: currentUser.organizationId });
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.search) {
      qb.andWhere(
        '(LOWER(user.email) LIKE LOWER(:search) OR LOWER(user.firstName) LIKE LOWER(:search) OR LOWER(user.lastName) LIKE LOWER(:search))',
        { search: `%${query.search.trim()}%` },
      );
    }

    qb.orderBy('user.createdAt', 'DESC').skip(skip).take(perPage);

    const [items, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / perPage);

    return {
      success: true,
      data: items.map((u) => this.sanitizeUser(u)),
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

  async findOne(id: string, currentUser: AuthenticatedUserPayload) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['organization'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
    if (!isSuperAdmin && user.organizationId !== currentUser.organizationId) {
      throw new ForbiddenException('Cross-tenant user access forbidden');
    }

    return {
      success: true,
      data: this.sanitizeUser(user),
      timestamp: new Date().toISOString(),
    };
  }

  async create(dto: CreateUserData, currentUser: AuthenticatedUserPayload) {
    const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
    const targetOrgId = isSuperAdmin
      ? dto.organizationId || currentUser.organizationId
      : currentUser.organizationId;

    if (!targetOrgId && !isSuperAdmin) {
      throw new BadRequestException('Organization ID is required');
    }

    if (targetOrgId) {
      const org = await this.orgRepository.findOne({ where: { id: targetOrgId } });
      if (!org) {
        throw new NotFoundException(`Target Organization not found`);
      }

      const count = await this.userRepository.count({ where: { organizationId: targetOrgId } });
      if (count >= org.maxUsers) {
        throw new BadRequestException(`Organization user limit reached (${org.maxUsers})`);
      }
    }

    const existing = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new BadRequestException(`User with email ${dto.email} already exists`);
    }

    const hashedPassword = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const newUser = this.userRepository.create({
      email: dto.email.toLowerCase().trim(),
      password: hashedPassword,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      role: dto.role || UserRole.VIEWER,
      organizationId: targetOrgId || undefined,
      isActive: true,
      mfaEnabled: false,
    });

    const saved: User = await this.userRepository.save(newUser);
    this.logger.log(`User created: ${saved.email} (Org: ${saved.organizationId}) by ${currentUser.email}`);

    return {
      success: true,
      data: this.sanitizeUser(saved),
      timestamp: new Date().toISOString(),
    };
  }

  async update(id: string, dto: UpdateUserData, currentUser: AuthenticatedUserPayload) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
    if (!isSuperAdmin && user.organizationId !== currentUser.organizationId) {
      throw new ForbiddenException('Cross-tenant user modification forbidden');
    }

    if (!isSuperAdmin) {
      if (user.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Cannot modify Super Admin user');
      }
      if (dto.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Only Super Admin can assign SUPER_ADMIN role');
      }
    }

    if (dto.firstName) user.firstName = dto.firstName.trim();
    if (dto.lastName) user.lastName = dto.lastName.trim();
    if (dto.role) user.role = dto.role;

    if (dto.isActive !== undefined) {
      if (user.id === currentUser.id && !dto.isActive) {
        throw new BadRequestException('Users cannot deactivate their own account');
      }
      user.isActive = dto.isActive;

      if (!dto.isActive) {
        await this.refreshTokenService.revokeAllUserTokens(user.id);
      }
    }

    const updated = await this.userRepository.save(user);
    this.logger.log(`User updated: ${updated.email} by ${currentUser.email}`);

    return {
      success: true,
      data: this.sanitizeUser(updated),
      timestamp: new Date().toISOString(),
    };
  }

  async deactivate(id: string, currentUser: AuthenticatedUserPayload) {
    if (id === currentUser.id) {
      throw new BadRequestException('Users cannot deactivate their own account');
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
    if (!isSuperAdmin && user.organizationId !== currentUser.organizationId) {
      throw new ForbiddenException('Cross-tenant user deactivation forbidden');
    }

    if (user.role === UserRole.SUPER_ADMIN && !isSuperAdmin) {
      throw new ForbiddenException('Cannot deactivate Super Admin account');
    }

    user.isActive = false;
    await this.userRepository.save(user);
    await this.refreshTokenService.revokeAllUserTokens(user.id);

    this.logger.log(`User deactivated: ${user.email} by ${currentUser.email}`);

    return {
      success: true,
      message: `User ${user.email} successfully deactivated`,
      timestamp: new Date().toISOString(),
    };
  }

  private sanitizeUser(user: User) {
    const { password, passwordHash, mfaSecret, ...safe } = user as any;
    return safe;
  }
}
