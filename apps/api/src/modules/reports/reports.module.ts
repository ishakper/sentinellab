import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportGeneratorService } from './report-generator.service';
import { ReportsController } from './reports.controller';
import { SecurityReport } from '../../database/entities/security-report.entity';
import { Vulnerability } from '../../database/entities/vulnerability.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SecurityReport, Vulnerability]),
    AuditModule,
  ],
  providers: [ReportGeneratorService],
  controllers: [ReportsController],
  exports: [ReportGeneratorService],
})
export class ReportsModule {}
