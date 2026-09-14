import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportSession } from '../../database/entities/support-session.entity';
import { SupportRequest } from '../../database/entities/support-request.entity';
import { Device } from '../../database/entities/device.entity';
import { DeviceGateway } from '../gateway/device.gateway';
import { AuditService } from '../audit/audit.service';
import { SupportSessionStatus, AuditAction } from '@sentinel/shared-types';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportSession)
    private readonly sessionRepo: Repository<SupportSession>,
    @InjectRepository(SupportRequest)
    private readonly requestRepo: Repository<SupportRequest>,
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
    private readonly deviceGateway: DeviceGateway,
    private readonly auditService: AuditService,
  ) {}

  async requestSession(deviceId: string, reason: string, currentUser: any) {
    const device = await this.deviceRepo.findOne({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    const request = this.requestRepo.create({
      deviceId,
      requestedBy: currentUser.id,
      organizationId: currentUser.organizationId,
      reason,
      status: SupportSessionStatus.CONSENT_PENDING,
      expiresAt,
    });
    const savedRequest = await this.requestRepo.save(request);

    const session = this.sessionRepo.create({
      deviceId,
      agentId: currentUser.id,
      organizationId: currentUser.organizationId,
      status: SupportSessionStatus.CONSENT_PENDING,
      startedAt: new Date(),
    });
    const savedSession = await this.sessionRepo.save(session);

    this.deviceGateway.sendCommandToDevice(deviceId, savedSession.id, 'REQUEST_SUPPORT_CONSENT', {
      requestId: savedRequest.id,
      sessionId: savedSession.id,
      reason,
      agentName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email,
    });

    await this.auditService.logAction(
      currentUser.id,
      currentUser.email,
      AuditAction.SUPPORT_SESSION_START,
      'SUPPORT_SESSION',
      savedSession.id,
      '127.0.0.1',
      'API',
      { deviceId, reason },
      currentUser.organizationId,
    );

    return {
      success: true,
      data: savedSession,
      timestamp: new Date().toISOString(),
    };
  }

  async grantConsent(sessionId: string, deviceId: string) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, deviceId } });
    if (!session) {
      throw new NotFoundException(`Support session ${sessionId} not found`);
    }

    session.status = SupportSessionStatus.ACTIVE;
    session.consentGrantedAt = new Date();
    await this.sessionRepo.save(session);

    if (this.deviceGateway.server) {
      this.deviceGateway.server.emit(`support.consent_granted.${session.organizationId}`, {
        sessionId: session.id,
        deviceId,
        status: SupportSessionStatus.ACTIVE,
      });
    }

    return {
      success: true,
      data: session,
      timestamp: new Date().toISOString(),
    };
  }

  async denyConsent(sessionId: string) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException(`Support session ${sessionId} not found`);
    }

    session.status = SupportSessionStatus.TERMINATED;
    session.endedAt = new Date();
    await this.sessionRepo.save(session);

    if (this.deviceGateway.server) {
      this.deviceGateway.server.emit(`support.consent_denied.${session.organizationId}`, {
        sessionId: session.id,
        status: SupportSessionStatus.TERMINATED,
      });
    }

    return {
      success: true,
      message: 'Support session consent denied',
      timestamp: new Date().toISOString(),
    };
  }

  async terminateSession(sessionId: string, triggeredBy: 'USER' | 'AGENT') {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException(`Support session ${sessionId} not found`);
    }

    session.status = SupportSessionStatus.TERMINATED;
    session.endedAt = new Date();
    await this.sessionRepo.save(session);

    // Instantly signal device kill switch over WebSocket
    this.deviceGateway.sendCommandToDevice(session.deviceId, session.id, 'TERMINATE_SUPPORT_SESSION', {
      sessionId: session.id,
      triggeredBy,
    });

    if (this.deviceGateway.server) {
      this.deviceGateway.server.emit(`support.session_ended.${session.organizationId}`, {
        sessionId: session.id,
        triggeredBy,
        status: SupportSessionStatus.TERMINATED,
      });
    }

    return {
      success: true,
      message: `Support session terminated by ${triggeredBy}`,
      timestamp: new Date().toISOString(),
    };
  }
}
