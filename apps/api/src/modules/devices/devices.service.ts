import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole, DeviceStatus } from '@sentinel/shared-types';
import { Device } from '../../database/entities/device.entity';
import { DeviceKey } from '../../database/entities/device-key.entity';
import { RedisService } from '../../common/redis/redis.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DevicesService {
  constructor(
    private readonly redisService: RedisService,
    private readonly auditService: AuditService,
    @InjectRepository(Device) private readonly deviceRepo: Repository<Device>,
    @InjectRepository(DeviceKey) private readonly deviceKeyRepo: Repository<DeviceKey>,
  ) {}

  async findAll(query: any, currentUser: any) {
    const { status, rooted, search, page = 1, limit = 10 } = query;
    const qb = this.deviceRepo.createQueryBuilder('device');

    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      qb.andWhere('device.organizationId = :orgId', { orgId: currentUser.organizationId });
    }

    if (status) {
      qb.andWhere('device.status = :status', { status });
    }

    if (rooted !== undefined) {
      qb.andWhere('device.isRooted = :rooted', { rooted: rooted === 'true' || rooted === true });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(device.deviceName) LIKE LOWER(:search) OR LOWER(device.model) LIKE LOWER(:search) OR LOWER(device.serialNumber) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('device.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      success: true,
      data: items,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    };
  }

  async findOne(id: string, currentUser: any) {
    const qb = this.deviceRepo.createQueryBuilder('device')
      .leftJoinAndSelect('device.keys', 'keys')
      .where('device.id = :id', { id });

    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      qb.andWhere('device.organizationId = :orgId', { orgId: currentUser.organizationId });
    }

    const device = await qb.getOne();

    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    return {
      success: true,
      data: device,
      timestamp: new Date().toISOString(),
    };
  }

  async unpairDevice(id: string, currentUser: any) {
    const device = await this.deviceRepo.findOne({ where: { id } });

    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    if (currentUser.role !== UserRole.SUPER_ADMIN && device.organizationId !== currentUser.organizationId) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    device.status = DeviceStatus.UNPAIRED;
    await this.deviceRepo.save(device);

    await this.deviceKeyRepo.update({ deviceId: id }, { isActive: false, revokedAt: new Date() });

    await this.redisService.del(`device_session:${id}`);

    await this.auditService.logAction(
      currentUser.id,
      currentUser.email,
      'DEVICE_UNPAIR' as any,
      'DEVICE',
      device.id,
      '127.0.0.1',
      'API',
      { deviceName: device.deviceName },
      device.organizationId,
    );

    return {
      success: true,
      message: `Device ${device.deviceName} successfully unpaired`,
      timestamp: new Date().toISOString(),
    };
  }

  async updatePosture(id: string, postureData: any) {
    const device = await this.deviceRepo.findOne({ where: { id } });
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    if (postureData.isRooted !== undefined) device.isRooted = postureData.isRooted;
    if (postureData.isEncrypted !== undefined) device.isEncrypted = postureData.isEncrypted;
    if (postureData.adbEnabled !== undefined) device.adbEnabled = postureData.adbEnabled;
    device.lastSeenAt = new Date();

    const saved = await this.deviceRepo.save(device);
    return {
      success: true,
      data: saved,
      timestamp: new Date().toISOString(),
    };
  }
}
