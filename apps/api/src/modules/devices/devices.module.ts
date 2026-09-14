import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { PairingService } from './pairing.service';

import { Device } from '../../database/entities/device.entity';
import { DeviceKey } from '../../database/entities/device-key.entity';
import { DevicePairing } from '../../database/entities/device-pairing.entity';
import { Organization } from '../../database/entities/organization.entity';

import { RedisModule } from '../../common/redis/redis.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, DeviceKey, DevicePairing, Organization]),
    ConfigModule,
    RedisModule,
    AuditModule,
  ],
  controllers: [DevicesController],
  providers: [DevicesService, PairingService],
  exports: [DevicesService, PairingService],
})
export class DevicesModule {}
