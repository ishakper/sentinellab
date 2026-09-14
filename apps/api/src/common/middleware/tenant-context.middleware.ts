import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Tenant context data stored within AsyncLocalStorage.
 */
export interface TenantContext {
  organizationId: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  requestId?: string;
}

/**
 * Global AsyncLocalStorage instance for request-scoped tenant isolation.
 */
export const tenantLocalStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Helper to retrieve the current active tenant context from AsyncLocalStorage.
 */
export function getTenantContext(): TenantContext | undefined {
  return tenantLocalStorage.getStore();
}

/**
 * Helper to retrieve the active tenant / organization ID from AsyncLocalStorage.
 */
export function getTenantId(): string | undefined {
  return tenantLocalStorage.getStore()?.organizationId;
}

/**
 * Helper to execute a synchronous or asynchronous callback within a specified tenant context.
 */
export function runWithTenantContext<T>(context: TenantContext, fn: () => T): T {
  return tenantLocalStorage.run(context, fn);
}

/**
 * Middleware that extracts tenant and user identity from the incoming JWT token
 * or headers, attaches `organizationId` to the Express Request object,
 * and initializes AsyncLocalStorage for the request lifecycle.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  use(
    req: Request & {
      organizationId?: string;
      user?: { organizationId?: string; id?: string; email?: string; role?: string };
    },
    res: Response,
    next: NextFunction,
  ) {
    let organizationId: string | undefined;
    let userId: string | undefined;
    let userEmail: string | undefined;
    let userRole: string | undefined;

    // 1. Check if passport/auth middleware already attached user
    if (req.user?.organizationId) {
      organizationId = req.user.organizationId;
      userId = req.user.id;
      userEmail = req.user.email;
      userRole = req.user.role;
    }

    // 2. Extract and decode JWT from Authorization header or cookies if not yet available
    if (!organizationId) {
      const token = this.extractToken(req);
      if (token) {
        const decoded = this.extractPayloadFromJwt(token);
        if (decoded) {
          organizationId =
            (decoded.organizationId as string) ||
            (decoded.orgId as string) ||
            (decoded.org_id as string);
          userId = (decoded.sub as string) || (decoded.id as string) || (decoded.userId as string);
          userEmail = decoded.email as string;
          userRole = decoded.role as string;
        }
      }
    }

    // 3. Fallback to X-Organization-ID header (used by public pairing / initial setup / superadmin)
    if (!organizationId) {
      const headerOrg = req.headers['x-organization-id'];
      if (typeof headerOrg === 'string' && headerOrg.trim()) {
        organizationId = headerOrg.trim();
      }
    }

    // 4. Attach organizationId to Express Request object
    if (organizationId) {
      req.organizationId = organizationId;
      res.setHeader('X-Organization-ID', organizationId);
    }

    // 5. Wrap the downstream request lifecycle in AsyncLocalStorage
    const tenantContext: TenantContext = {
      organizationId: organizationId || '',
      userId,
      userEmail,
      userRole,
      requestId: req.headers['x-request-id'] as string | undefined,
    };

    tenantLocalStorage.run(tenantContext, () => {
      next();
    });
  }

  /**
   * Safely extracts the JWT token from the Authorization header or cookies.
   */
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }

    const cookies = req.cookies as Record<string, string> | undefined;
    if (cookies) {
      if (cookies.accessToken) {
        return cookies.accessToken;
      }
      if (cookies.access_token) {
        return cookies.access_token;
      }
    }

    return null;
  }

  /**
   * Safely decodes a JWT payload without signature verification
   * (Signature validation occurs inside the dedicated JwtAuthGuard).
   */
  private extractPayloadFromJwt(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length === 3 && parts[1]) {
        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
        const parsed = JSON.parse(payloadJson);
        if (parsed && typeof parsed === 'object') {
          return parsed as Record<string, unknown>;
        }
      }
    } catch (error) {
      this.logger.debug(`Failed to decode JWT payload: ${(error as Error).message}`);
    }
    return null;
  }
}
