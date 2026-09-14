import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { SupportSession } from '../../database/entities/support-session.entity';
import { SupportRequest } from '../../database/entities/support-request.entity';
import { Device } from '../../database/entities/device.entity';
import { GatewayModule } from '../gateway/gateway.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportSession, SupportRequest, Device]),
    GatewayModule,
    AuditModule,
  ],
  providers: [SupportService],
  controllers: [SupportController],
  exports: [SupportService],
})
export class SupportModule {}
