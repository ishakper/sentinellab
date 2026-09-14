import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used to mark routes as public.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark route handlers or entire controllers as public,
 * bypassing the global JWT authentication and tenant guards.
 *
 * @example
 * ```ts
 * @Public()
 * @Get('health')
 * getHealth() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
