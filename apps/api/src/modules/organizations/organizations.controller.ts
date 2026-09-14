import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { UserRole, ApiResponse as ApiRes } from '@sentinel/shared-types';

import { OrganizationsService, DetailedOrganizationDto } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto, QueryOrganizationDto } from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Organizations')
@ApiBearerAuth('access-token')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /**
   * GET /api/v1/organizations - List organizations (SUPER_ADMIN only)
   */
  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all organizations (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'List of organizations retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: SUPER_ADMIN required' })
  async findAll(@Query() query: QueryOrganizationDto): Promise<ApiRes<DetailedOrganizationDto[]>> {
    return this.organizationsService.findAll(query);
  }

  /**
   * GET /api/v1/organizations/:id - Get organization details (SUPER_ADMIN or member)
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get organization details by ID' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, description: 'Organization details retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden: Cross-tenant access denied' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ApiRes<DetailedOrganizationDto>> {
    return this.organizationsService.findById(id, currentUser);
  }

  /**
   * POST /api/v1/organizations - Create organization (SUPER_ADMIN only)
   */
  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new organization (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden: SUPER_ADMIN required' })
  @ApiResponse({ status: 409, description: 'Organization name or slug already exists' })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ApiRes<DetailedOrganizationDto>> {
    return this.organizationsService.create(dto, currentUser);
  }

  /**
   * PATCH /api/v1/organizations/:id - Update organization settings
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update organization settings' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden: Quota updates require SUPER_ADMIN' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ApiRes<DetailedOrganizationDto>> {
    return this.organizationsService.update(id, dto, currentUser);
  }
}
