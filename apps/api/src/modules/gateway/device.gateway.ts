import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommandExecutionService } from './command-execution.service';
import { SignatureVerifier } from '@sentinel/crypto-core';
import { RedisService } from '../../common/redis/redis.service';
import { DeviceKey } from '../../database/entities/device-key.entity';
import { Device } from '../../database/entities/device.entity';
import { DeviceStatus } from '@sentinel/shared-types';

@WebSocketGateway(3002, { namespace: '/ws/device', cors: { origin: '*' } })
@Injectable()
export class DeviceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DeviceGateway.name);
  private connectedDevices = new Map<string, Socket>();

  constructor(
    @Inject(forwardRef(() => CommandExecutionService))
    private readonly commandExecutionService: CommandExecutionService,
    private readonly redisService: RedisService,
    @InjectRepository(DeviceKey) private readonly deviceKeyRepo: Repository<DeviceKey>,
    @InjectRepository(Device) private readonly deviceRepo: Repository<Device>,
  ) {}

  async handleConnection(client: Socket) {
    const deviceId = (client.handshake.query.deviceId || client.handshake.headers['x-device-id']) as string;
    const timestamp = client.handshake.headers['x-timestamp'] as string;
    const signature = client.handshake.headers['x-signature'] as string;

    if (!deviceId) {
      this.logger.warn(`Connection rejected: Missing device ID`);
      client.disconnect();
      return;
    }

    try {
      if (timestamp && signature) {
        const activeKey = await this.deviceKeyRepo.findOne({
          where: { deviceId, isActive: true },
        });

        if (activeKey) {
          const isValid = SignatureVerifier.verifyECDSA(activeKey.publicKeyPem, signature, {
            deviceId,
            timestamp,
          });
          if (!isValid) {
            this.logger.warn(`Connection rejected: Invalid signature for device ${deviceId}`);
            client.disconnect();
            return;
          }
        }
      }

      const device = await this.deviceRepo.findOne({ where: { id: deviceId } });
      const orgId = device?.organizationId || 'default';

      this.connectedDevices.set(deviceId, client);
      (client as any).deviceId = deviceId;
      (client as any).orgId = orgId;

      await this.redisService.setPresence('device', deviceId, 'ONLINE', orgId);
      await this.deviceRepo.update(deviceId, { status: DeviceStatus.ONLINE, lastSeenAt: new Date() });

      this.logger.log(`Device connected & authenticated: ${deviceId}`);
    } catch (e) {
      this.logger.error(`Error verifying connection for device ${deviceId}`, e);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const deviceId = (client as any).deviceId;
    const orgId = (client as any).orgId || 'default';
    if (deviceId) {
      this.connectedDevices.delete(deviceId);
      await this.redisService.setPresence('device', deviceId, 'OFFLINE', orgId);
      await this.deviceRepo.update(deviceId, { status: DeviceStatus.OFFLINE });
      this.logger.log(`Device disconnected: ${deviceId}`);
    }
  }

  @SubscribeMessage('device.heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    const deviceId = (client as any).deviceId;
    if (deviceId) {
      await this.redisService.recordDeviceHeartbeat(deviceId, data);
      await this.deviceRepo.update(deviceId, { lastSeenAt: new Date() });
    }
  }

  @SubscribeMessage('command.result')
  async handleCommandResult(@ConnectedSocket() client: Socket, @MessageBody() data: { commandId: string; resultData: any; executionTimeMs: number }) {
    if (data?.commandId) {
      await this.commandExecutionService.handleCommandResult(data.commandId, data.resultData, data.executionTimeMs || 0);
    }
  }

  sendCommandToDevice(deviceId: string, commandId: string, type: string, payload: any): boolean {
    const client = this.connectedDevices.get(deviceId);
    if (!client) {
      return false;
    }
    client.emit('command.issued', { commandId, type, payload });
    return true;
  }
}
