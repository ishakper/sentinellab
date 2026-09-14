import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@sentinel/shared-types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard to enforce strict multi-tenant isolation.
 * Prevents cross-tenant data access by validating request parameters, headers, query, and body
 * against the authenticated user's organizationId.
 * SUPER_ADMIN role bypasses tenant restrictions.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no authenticated user yet, allow proceeding (JwtAuthGuard handles 401 if not public)
    if (!user) {
      return true;
    }

    // SUPER_ADMIN has global privileges across all tenants
    if (user.role === UserRole.SUPER_ADMIN || user.role === 'SUPER_ADMIN') {
      const explicitOrgId =
        (request.headers['x-organization-id'] as string) ||
        request.params?.organizationId ||
        request.params?.orgId ||
        request.params?.tenantId ||
        request.query?.organizationId ||
        request.query?.orgId;

      const effectiveTenant = explicitOrgId || user.organizationId || null;
      request.tenantId = effectiveTenant;
      request.organizationId = effectiveTenant;
      return true;
    }

    // Non-SUPER_ADMIN users must belong to an organization
    if (!user.organizationId) {
      throw new ForbiddenException('User is not assigned to any organization');
    }

    // Prevent cross-tenant access if an organization ID was explicitly targeted in headers, params, query, or body
    const explicitOrgId =
      (request.headers['x-organization-id'] as string) ||
      request.params?.organizationId ||
      request.params?.orgId ||
      request.params?.tenantId ||
      request.query?.organizationId ||
      request.query?.orgId ||
      request.query?.tenantId;

    if (explicitOrgId && explicitOrgId !== user.organizationId) {
      throw new ForbiddenException('Cross-tenant access prohibited');
    }

    // Also check payload body if present for mutation requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.body && typeof request.body === 'object') {
      const bodyOrgId = request.body.organizationId || request.body.orgId || request.body.tenantId;
      if (bodyOrgId && bodyOrgId !== user.organizationId) {
        throw new ForbiddenException('Cross-tenant access prohibited: payload organization mismatch');
      }
    }

    request.tenantId = user.organizationId;
    request.organizationId = user.organizationId;
    return true;
  }
}
