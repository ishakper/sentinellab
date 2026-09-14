import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ResearchProjectStatus } from '../../../database/entities/research-project.entity';

export class CreateResearchProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  institution!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  principalResearcher!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  supervisor!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsEnum(ResearchProjectStatus)
  status?: ResearchProjectStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ethicsApprovalNumber?: string;
}
