import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';
import { DeviceStatus, PairingStatus } from '@sentinel/shared-types';
import { Device } from '../../database/entities/device.entity';
import { DeviceKey } from '../../database/entities/device-key.entity';
import { DevicePairing } from '../../database/entities/device-pairing.entity';
import { RedisService } from '../../common/redis/redis.service';

export interface DeviceRegistrationDto {
  pairingToken: string;
  publicKey: string;
  deviceName?: string;
  manufacturer?: string;
  model?: string;
  androidVersion?: string;
  securityPatchLevel?: string;
  serialNumber?: string;
}

@Injectable()
export class PairingService {
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    @InjectRepository(Device) private readonly deviceRepo: Repository<Device>,
    @InjectRepository(DeviceKey) private readonly deviceKeyRepo: Repository<DeviceKey>,
    @InjectRepository(DevicePairing) private readonly devicePairingRepo: Repository<DevicePairing>,
  ) {}

  async generatePairingToken(organizationId: string, requestedBy: string) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const ttlSec = 300; // 5 minutes single-use TTL
    const redisKey = `pairing_token:${tokenHash}`;
    const payload = JSON.stringify({
      organizationId,
      requestedBy,
      tokenHash,
    });

    await this.redisService.set(redisKey, payload, ttlSec);

    const expiresAt = new Date(Date.now() + ttlSec * 1000);
    const pairingRecord = this.devicePairingRepo.create({
      pairingToken: rawToken,
      tokenHash,
      organizationId,
      requestedBy,
      status: PairingStatus.PENDING,
      expiresAt,
    });

    await this.devicePairingRepo.save(pairingRecord);

    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3001');
    const qrPayload = JSON.stringify({
      pairingToken: rawToken,
      organizationId,
      serverUrl: `${appUrl}/api/v1/devices/register`,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);

    return {
      success: true,
      data: {
        pairingToken: rawToken,
        qrCodeDataUrl,
        expiresAt: expiresAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  async verifyAndRegisterDevice(dto: DeviceRegistrationDto) {
    if (!dto.pairingToken || !dto.publicKey) {
      throw new BadRequestException('Pairing token and public key are required');
    }

    const tokenHash = crypto.createHash('sha256').update(dto.pairingToken).digest('hex');
    const redisKey = `pairing_token:${tokenHash}`;

    const redisDataStr = await this.redisService.get<string>(redisKey);
    if (!redisDataStr) {
      throw new BadRequestException('Invalid or expired pairing token');
    }

    const pairingData = typeof redisDataStr === 'string' ? JSON.parse(redisDataStr) : redisDataStr;

    // Single-use enforcement: Delete immediately after reading
    await this.redisService.del(redisKey);

    const pairingRecord = await this.devicePairingRepo.findOne({ where: { tokenHash } });
    if (pairingRecord) {
      pairingRecord.status = PairingStatus.VERIFIED;
      pairingRecord.verifiedAt = new Date();
      await this.devicePairingRepo.save(pairingRecord);
    }

    const serialNum = dto.serialNumber || `SN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    let device = await this.deviceRepo.findOne({
      where: { serialNumber: serialNum, organizationId: pairingData.organizationId },
    });

    if (!device) {
      device = this.deviceRepo.create({
        deviceName: dto.deviceName || dto.model || 'Simulated Android Device',
        manufacturer: dto.manufacturer || 'Generic',
        model: dto.model || 'Lab Device',
        androidVersion: dto.androidVersion || '14.0',
        securityPatchLevel: dto.securityPatchLevel || '2026-08-01',
        serialNumber: serialNum,
        status: DeviceStatus.PAIRED,
        isRooted: false,
        isEncrypted: true,
        adbEnabled: false,
        organizationId: pairingData.organizationId,
        lastSeenAt: new Date(),
      });
    } else {
      device.status = DeviceStatus.PAIRED;
      device.lastSeenAt = new Date();
    }

    const savedDevice = await this.deviceRepo.save(device);

    const deviceKey = this.deviceKeyRepo.create({
      deviceId: savedDevice.id,
      publicKeyPem: dto.publicKey,
      keyAlgorithm: 'secp256r1',
      isActive: true,
    });

    await this.deviceKeyRepo.save(deviceKey);

    return {
      success: true,
      data: {
        deviceId: savedDevice.id,
        deviceName: savedDevice.deviceName,
        status: savedDevice.status,
        organizationId: savedDevice.organizationId,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
