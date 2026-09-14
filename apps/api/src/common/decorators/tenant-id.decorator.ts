import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { getTenantId as getAsyncStorageTenantId } from '../middleware/tenant-context.middleware';

/**
 * Parameter decorator to extract the organizationId (tenant ID)
 * from the authenticated request context.
 *
 * Checks in order:
 * 1. Authenticated user object (`req.user.organizationId`)
 * 2. Request context property set by tenant middleware/guard (`req.organizationId`)
 * 3. Node.js AsyncLocalStorage store (`getTenantId()`)
 * 4. Request header (`x-organization-id`)
 *
 * @example
 * ```ts
 * @Get('devices')
 * listDevices(@TenantId() organizationId: string) {
 *   return this.deviceService.findAll(organizationId);
 * }
 * ```
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<
      Request & {
        organizationId?: string;
        user?: { organizationId?: string; [key: string]: unknown };
      }
    >();

    const tenantId =
      request.user?.organizationId ||
      request.organizationId ||
      getAsyncStorageTenantId() ||
      (request.headers['x-organization-id'] as string | undefined);

    return tenantId;
  },
);
