import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@sentinel/shared-types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<(UserRole | string)[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // SUPER_ADMIN has system-wide access to role-protected endpoints
    if (user.role === UserRole.SUPER_ADMIN || user.role === 'SUPER_ADMIN') {
      return true;
    }

    const hasRole = requiredRoles.some(
      (role) => String(role).toUpperCase() === String(user.role).toUpperCase(),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Forbidden: Insufficient privileges. Required: [${requiredRoles.join(', ')}], Current: ${user.role}`,
      );
    }

    return true;
  }
}
