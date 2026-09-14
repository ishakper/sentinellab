import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabController } from './lab.controller';
import { LabSimulatorService } from './lab-simulator.service';
// Assuming these modules and entities exist
// import { Vulnerability } from '../vulnerability/entities/vulnerability.entity';
// import { VulnerabilityEvidence } from '../vulnerability/entities/vulnerability-evidence.entity';
// import { Device } from '../device/entities/device.entity';
// import { AuditModule } from '../audit/audit.module';

@Module({
  // imports: [
  //   TypeOrmModule.forFeature([Vulnerability, VulnerabilityEvidence, Device]),
  //   AuditModule
  // ],
  controllers: [LabController],
  providers: [LabSimulatorService],
  exports: [LabSimulatorService]
})
export class LabModule {}
