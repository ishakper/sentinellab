import { Injectable, ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserRole,
  ApiResponse,
  AuditLogDto,
  AuditAction,
  SecurityEventType,
  VulnerabilitySeverity,
  WebSocketEvent,
  SecurityAlertPayload,
} from '@sentinel/shared-types';

import { AuditLog } from '../../database/entities/audit-log.entity';
import { SecurityEvent } from '../../database/entities/security-event.entity';
import { QueryAuditDto } from './dto/query-audit.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RedisService } from '../../common/redis/redis.service';

export interface CreateAuditEntry {
  actorId?: string | null;
  actorEmail?: string | null;
  action: AuditAction | string;
  resourceType: string;
  resourceId?: string | null;
  ipAddress?: string;
  userAgent?: string;
  payload?: Record<string, any> | null;
  organizationId?: string | null;
}

export interface LogSecurityEventParams {
  eventType: SecurityEventType;
  severity?: VulnerabilitySeverity;
  sourceIp: string;
  targetResource?: string | null;
  description: string;
  metadata?: Record<string, any> | null;
  organizationId: string;
}

interface ThresholdRule {
  limit: number;
  windowSec: number;
}

const DEFAULT_SECURITY_THRESHOLDS: Record<SecurityEventType, ThresholdRule> = {
  [SecurityEventType.BRUTE_FORCE_DETECTED]: { limit: 1, windowSec: 300 },
  [SecurityEventType.SESSION_HIJACK_ATTEMPT]: { limit: 1, windowSec: 300 },
  [SecurityEventType.PAIRING_REPLAY_ATTEMPT]: { limit: 2, windowSec: 300 },
  [SecurityEventType.INVALID_DEVICE_SIGNATURE]: { limit: 3, windowSec: 300 },
  [SecurityEventType.SUSPICIOUS_FILE_OPERATION]: { limit: 3, windowSec: 300 },
  [SecurityEventType.FAILED_LOGIN_THRESHOLD]: { limit: 5, windowSec: 900 },
  [SecurityEventType.UNAUTHORIZED_RESOURCE_ACCESS]: { limit: 5, windowSec: 300 },
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(SecurityEvent)
    private readonly securityEventRepo: Repository<SecurityEvent>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Inserts an append-only record into `audit_logs`.
   *
   * @param actorId UUID of user triggering action
   * @param actorEmail User email
   * @param action AuditAction enum
   * @param resourceType Name of targeted resource
   * @param resourceId ID of targeted resource
   * @param ipAddress Client IP
   * @param userAgent Client user-agent
   * @param payload Operation details/state
   * @param organizationId Tenant UUID
   */
  async logAction(
    actorId: string,
    actorEmail: string,
    action: AuditAction,
    resourceType: string,
    resourceId: string | null,
    ipAddress: string,
    userAgent: string,
    payload: any,
    organizationId: string,
  ): Promise<AuditLog> {
    try {
      const formattedPayload =
        payload !== null && payload !== undefined
          ? typeof payload === 'object'
            ? payload
            : { value: payload }
          : null;

      const record = this.auditRepo.create({
        actorId,
        actorEmail,
        action,
        resourceType,
        resourceId,
        ipAddress: ipAddress || '0.0.0.0',
        userAgent: userAgent ? userAgent.substring(0, 500) : 'Unknown',
        payload: formattedPayload,
        organizationId,
      });

      const saved = await this.auditRepo.save(record);
      this.logger.debug(
        `[Audit] Action [${action}] by [${actorEmail}] on [${resourceType}:${resourceId ?? 'N/A'}] in org [${organizationId}]`,
      );

      return saved;
    } catch (err: any) {
      this.logger.error(`Failed to record audit log: ${err.message}`, err.stack);
      throw err;
    }
  }

  /**
   * Overloaded signature: Log security event via parameter object.
   */
  async logSecurityEvent(params: LogSecurityEventParams): Promise<SecurityEvent>;

  /**
   * Overloaded signature: Log security event via positional arguments.
   */
  async logSecurityEvent(
    eventType: SecurityEventType,
    sourceIp: string,
    description: string,
    organizationId: string,
    severity?: VulnerabilitySeverity,
    targetResource?: string | null,
    metadata?: Record<string, any> | null,
  ): Promise<SecurityEvent>;

  /**
   * Inserts record into `security_events` and emits alert if threshold breached.
   */
  async logSecurityEvent(
    arg1: SecurityEventType | LogSecurityEventParams,
    arg2?: string,
    arg3?: string,
    arg4?: string,
    arg5?: VulnerabilitySeverity,
    arg6?: string | null,
    arg7?: Record<string, any> | null,
  ): Promise<SecurityEvent> {
    let params: LogSecurityEventParams;

    if (typeof arg1 === 'object') {
      params = arg1;
    } else {
      params = {
        eventType: arg1,
        sourceIp: arg2!,
        description: arg3!,
        organizationId: arg4!,
        severity: arg5 ?? VulnerabilitySeverity.HIGH,
        targetResource: arg6 ?? null,
        metadata: arg7 ?? null,
      };
    }

    const {
      eventType,
      sourceIp,
      description,
      organizationId,
      severity = VulnerabilitySeverity.HIGH,
      targetResource = null,
      metadata = null,
    } = params;

    // 1. Create and persist append-only record into security_events
    const event = this.securityEventRepo.create({
      eventType,
      severity,
      sourceIp,
      targetResource,
      description,
      metadata,
      acknowledged: false,
      organizationId,
    });

    const savedEvent = await this.securityEventRepo.save(event);

    // 2. Evaluate sliding-window threshold in Redis
    const rule = DEFAULT_SECURITY_THRESHOLDS[eventType] || { limit: 3, windowSec: 300 };
    const rateLimitKey = `sec_thresh:${organizationId}:${eventType}:${sourceIp}`;

    const rateResult = await this.redisService.slidingWindowRateLimit(
      rateLimitKey,
      rule.limit,
      rule.windowSec,
    );

    const isThresholdBreached =
      !rateResult.allowed ||
      rateResult.currentCount >= rule.limit ||
      severity === VulnerabilitySeverity.CRITICAL;

    // 3. Emit real-time alert via Redis Pub/Sub if breached
    if (isThresholdBreached) {
      await this.emitSecurityAlert(savedEvent, rule, rateResult.currentCount);
    }

    return savedEvent;
  }

  /**
   * Backwards-compatible log helper.
   */
  async log(entry: CreateAuditEntry): Promise<AuditLog> {
    return this.logAction(
      entry.actorId || '00000000-0000-0000-0000-000000000000',
      entry.actorEmail || 'system@sentinellab.local',
      entry.action as AuditAction,
      entry.resourceType,
      entry.resourceId || null,
      entry.ipAddress || '0.0.0.0',
      entry.userAgent || 'System',
      entry.payload || null,
      entry.organizationId || '00000000-0000-0000-0000-000000000000',
    );
  }

  /**
   * Paginated listing of audit logs with tenant isolation and RBAC.
   */
  async findAll(query: QueryAuditDto, currentUser: AuthenticatedUser): Promise<ApiResponse<AuditLogDto[]>> {
    const page = Math.max(1, query.page || 1);
    const perPage = Math.min(100, Math.max(1, query.perPage || 20));
    const skip = (page - 1) * perPage;

    const qb = this.auditRepo.createQueryBuilder('audit');

    const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;

    if (isSuperAdmin) {
      if (query.organizationId) {
        qb.andWhere('audit.organizationId = :orgId', { orgId: query.organizationId });
      }
    } else {
      if (!currentUser.organizationId) {
        throw new ForbiddenException('User has no organization assignment');
      }
      qb.andWhere('audit.organizationId = :orgId', { orgId: currentUser.organizationId });
    }

    if (query.action) {
      qb.andWhere('audit.action = :action', { action: query.action });
    }

    if (query.resourceType) {
      qb.andWhere('audit.resourceType = :resourceType', { resourceType: query.resourceType });
    }

    if (query.actorId) {
      qb.andWhere('audit.actorId = :actorId', { actorId: query.actorId });
    }

    const sortOrder = (query.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy('audit.createdAt', sortOrder);
    qb.skip(skip).take(perPage);

    const [logs, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / perPage);

    return {
      success: true,
      data: logs.map((l) => ({
        id: l.id,
        actorId: l.actorId || '',
        actorEmail: l.actorEmail || '',
        action: l.action,
        resourceType: l.resourceType,
        resourceId: l.resourceId,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        payload: l.payload,
        organizationId: l.organizationId || '',
        createdAt: l.createdAt.toISOString(),
      })),
      meta: {
        page,
        perPage,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Paginated listing of security events.
   */
  async findSecurityEvents(
    organizationId: string,
    options: {
      page?: number;
      perPage?: number;
      eventType?: SecurityEventType;
      severity?: VulnerabilitySeverity;
      acknowledged?: boolean;
    } = {},
  ): Promise<ApiResponse<SecurityEvent[]>> {
    const page = Math.max(1, options.page || 1);
    const perPage = Math.min(100, Math.max(1, options.perPage || 20));
    const skip = (page - 1) * perPage;

    const qb = this.securityEventRepo.createQueryBuilder('event');
    qb.where('event.organizationId = :organizationId', { organizationId });

    if (options.eventType) {
      qb.andWhere('event.eventType = :eventType', { eventType: options.eventType });
    }

    if (options.severity) {
      qb.andWhere('event.severity = :severity', { severity: options.severity });
    }

    if (options.acknowledged !== undefined) {
      qb.andWhere('event.acknowledged = :acknowledged', { acknowledged: options.acknowledged });
    }

    qb.orderBy('event.createdAt', 'DESC');
    qb.skip(skip).take(perPage);

    const [events, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / perPage);

    return {
      success: true,
      data: events,
      meta: {
        page,
        perPage,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Mark a security event as acknowledged.
   */
  async acknowledgeSecurityEvent(id: string, organizationId: string): Promise<SecurityEvent> {
    const event = await this.securityEventRepo.findOne({
      where: { id, organizationId },
    });

    if (!event) {
      throw new NotFoundException(`Security event [${id}] not found in organization [${organizationId}]`);
    }

    event.acknowledged = true;
    return await this.securityEventRepo.save(event);
  }

  /**
   * Emits high-priority security alert across system and tenant Pub/Sub channels.
   */
  private async emitSecurityAlert(
    event: SecurityEvent,
    rule: ThresholdRule,
    currentCount: number,
  ): Promise<void> {
    const alertMessage = `SECURITY ALERT [${event.severity}]: Anomaly threshold reached (${currentCount}/${rule.limit} in ${rule.windowSec}s) for [${event.eventType}] from source [${event.sourceIp}]: ${event.description}`;

    this.logger.error(alertMessage);

    const alertPayload: SecurityAlertPayload = {
      eventId: event.id,
      eventType: event.eventType,
      severity: event.severity,
      description: alertMessage,
      sourceIp: event.sourceIp,
      organizationId: event.organizationId,
      timestamp: event.createdAt.toISOString(),
    };

    try {
      // 1. Publish to global WebSocket alert channel
      await this.redisService.publish(WebSocketEvent.SECURITY_ALERT, alertPayload);

      // 2. Publish to tenant-isolated alert channel
      await this.redisService.publish(
        `organization:${event.organizationId}:security-alerts`,
        alertPayload,
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to publish security alert to Redis for event [${event.id}]: ${err.message}`,
      );
    }
  }
}
