import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ResearchProjectStatus } from '../../../database/entities/research-project.entity';

export class UpdateResearchProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  institution?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  principalResearcher?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  supervisor?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsEnum(ResearchProjectStatus)
  status?: ResearchProjectStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ethicsApprovalNumber?: string;
}
