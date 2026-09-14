import { Transform } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AuthorizationRecordStatus } from '../../../database/entities/authorization-record.entity';

const parseArray = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export class UpdateAuthorizationRecordDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  assetOwner?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  authorizedBy?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @Transform(parseArray)
  @IsArray()
  @IsString({ each: true })
  approvedTargets?: string[];

  @IsOptional()
  @Transform(parseArray)
  @IsArray()
  @IsString({ each: true })
  prohibitedActions?: string[];

  @IsOptional()
  @IsEnum(AuthorizationRecordStatus)
  status?: AuthorizationRecordStatus;
}
