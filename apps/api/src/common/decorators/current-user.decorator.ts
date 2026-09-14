import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@sentinel/shared-types';

/**
 * Interface representing the authenticated user payload attached to Express request.
 */
export interface CurrentUserPayload {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  organizationId: string;
  sessionId?: string;
  [key: string]: unknown;
}

/**
 * Alias for backward compatibility.
 */
export type AuthenticatedUser = CurrentUserPayload;

/**
 * Parameter decorator to extract the authenticated user object or a specific property
 * from the request context (`req.user`).
 *
 * @param data Optional property name to extract from the user object (e.g. 'id', 'email', 'role').
 * @example
 * ```ts
 * @Get('profile')
 * getProfile(@CurrentUser() user: CurrentUserPayload) {
 *   return user;
 * }
 *
 * @Get('me/role')
 * getRole(@CurrentUser('role') role: UserRole) {
 *   return { role };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: CurrentUserPayload }>();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data !== undefined ? user[data] : user;
  },
);
