import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UserRole, ApiResponse as ApiRes, UserDto } from '@sentinel/shared-types';

import { UsersService } from './users.service';
import { QueryUserDto, UpdateUserDto, CreateUserDto } from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/users - List organization users (paginated, tenant-isolated)
   */
  @Get()
  @ApiOperation({ summary: 'List organization users with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated user list retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions' })
  async findAll(
    @Query() query: QueryUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ApiRes<UserDto[]>> {
    return this.usersService.findAll(query, currentUser);
  }

  /**
   * GET /api/v1/users/:id - Get user details
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User details retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden: Cross-tenant access denied' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ApiRes<UserDto>> {
    return this.usersService.findOne(id, currentUser) as any;
  }

  /**
   * POST /api/v1/users - Create new organization user (ADMIN or SUPER_ADMIN)
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new user within organization' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 400, description: 'Validation or limit error' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ApiRes<UserDto>> {
    return this.usersService.create(dto, currentUser) as any;
  }

  /**
   * PATCH /api/v1/users/:id - Update user role or status (ADMIN or SUPER_ADMIN required)
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update user profile, role, or active status' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient privileges' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ApiRes<UserDto>> {
    return this.usersService.update(id, dto, currentUser) as any;
  }

  /**
   * DELETE /api/v1/users/:id - Deactivate user (ADMIN or SUPER_ADMIN required)
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Deactivate user account' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  @ApiResponse({ status: 400, description: 'Cannot deactivate self' })
  @ApiResponse({ status: 403, description: 'Forbidden: Cannot deactivate super admin' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<any> {
    return this.usersService.deactivate(id, currentUser);
  }
}
