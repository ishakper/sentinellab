import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResearchProject } from '../../database/entities/research-project.entity';
import { ResearchProjectsController } from './research-projects.controller';
import { ResearchProjectsService } from './research-projects.service';

@Module({
  imports: [TypeOrmModule.forFeature([ResearchProject])],
  controllers: [ResearchProjectsController],
  providers: [ResearchProjectsService],
  exports: [ResearchProjectsService],
})
export class ResearchProjectsModule {}
