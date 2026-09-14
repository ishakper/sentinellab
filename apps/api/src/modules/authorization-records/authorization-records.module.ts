import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationRecord } from '../../database/entities/authorization-record.entity';
import { ResearchProject } from '../../database/entities/research-project.entity';
import { AuthorizationRecordsController } from './authorization-records.controller';
import { AuthorizationRecordsService } from './authorization-records.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuthorizationRecord, ResearchProject])],
  controllers: [AuthorizationRecordsController],
  providers: [AuthorizationRecordsService],
  exports: [AuthorizationRecordsService],
})
export class AuthorizationRecordsModule {}
