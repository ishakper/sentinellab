import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for fine-grained permission-based authorization.
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to enforce granular permission requirements on route handlers or controllers.
 *
 * @param permissions One or more permission strings (e.g., 'devices:read', 'vulnerabilities:write').
 * @example
 * ```ts
 * @Permissions('devices:write', 'devices:delete')
 * @Delete(':id')
 * removeDevice(@Param('id') id: string) { ... }
 * ```
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
