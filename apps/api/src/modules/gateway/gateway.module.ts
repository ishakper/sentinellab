import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceGateway } from './device.gateway';
import { CommandExecutionService } from './command-execution.service';
import { Command } from '../../database/entities/command.entity';
import { CommandResult } from '../../database/entities/command-result.entity';
import { Device } from '../../database/entities/device.entity';
import { DeviceKey } from '../../database/entities/device-key.entity';
import { RedisModule } from '../../common/redis/redis.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Command, CommandResult, Device, DeviceKey]),
    RedisModule,
    AuditModule,
  ],
  providers: [DeviceGateway, CommandExecutionService],
  exports: [DeviceGateway, CommandExecutionService],
})
export class GatewayModule {}
