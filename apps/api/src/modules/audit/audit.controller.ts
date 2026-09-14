import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  UserRole,
  ApiResponse as ApiRes,
  AuditLogDto,
  SecurityEventType,
  VulnerabilitySeverity,
} from '@sentinel/shared-types';

import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { SecurityEvent } from '../../database/entities/security-event.entity';

@ApiTags('Audit')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard, TenantGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'List audit logs (Tenant-isolated or SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: ADMIN or SUPER_ADMIN required' })
  async getLogs(
    @Query() query: QueryAuditDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ApiRes<AuditLogDto[]>> {
    return this.auditService.findAll(query, currentUser);
  }

  @Get('/security/events')
  @ApiOperation({ summary: 'List security events for tenant' })
  @ApiResponse({ status: 200, description: 'Security events retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: ADMIN or SUPER_ADMIN required' })
  async getSecurityEvents(
    @TenantId() organizationId: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('eventType') eventType?: SecurityEventType,
    @Query('severity') severity?: VulnerabilitySeverity,
    @Query('acknowledged') acknowledged?: boolean,
  ): Promise<ApiRes<SecurityEvent[]>> {
    return this.auditService.findSecurityEvents(organizationId, {
      page: page ? Number(page) : 1,
      perPage: perPage ? Number(perPage) : 20,
      eventType,
      severity,
      acknowledged: acknowledged !== undefined ? String(acknowledged) === 'true' : undefined,
    });
  }

  @Post('/security/events/:id/ack')
  @ApiOperation({ summary: 'Acknowledge a security event' })
  @ApiResponse({ status: 200, description: 'Security event acknowledged' })
  @ApiResponse({ status: 404, description: 'Security event not found' })
  async acknowledgeSecurityEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<ApiRes<SecurityEvent>> {
    const event = await this.auditService.acknowledgeSecurityEvent(id, organizationId);
    return {
      success: true,
      data: event,
      timestamp: new Date().toISOString(),
    };
  }
}
