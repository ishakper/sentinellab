import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@sentinel/shared-types';

/**
 * Metadata key for roles-based authorization.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator to enforce Role-Based Access Control (RBAC) on routes.
 *
 * @param roles One or more UserRole enums required to access the endpoint.
 * @example
 * ```ts
 * @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
 * @Post('users')
 * createUser(@Body() dto: CreateUserDto) { ... }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
