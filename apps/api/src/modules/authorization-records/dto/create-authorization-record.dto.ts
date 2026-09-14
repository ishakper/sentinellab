import { Transform } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { AuthorizationRecordStatus } from '../../../database/entities/authorization-record.entity';

const parseArray = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export class CreateAuthorizationRecordDto {
  @IsUUID('4')
  researchProjectId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  assetOwner!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  authorizedBy!: string;

  @IsDateString()
  validFrom!: string;

  @IsDateString()
  validUntil!: string;

  @Transform(parseArray)
  @IsArray()
  @IsString({ each: true })
  approvedTargets!: string[];

  @Transform(parseArray)
  @IsArray()
  @IsString({ each: true })
  prohibitedActions!: string[];

  @IsEnum(AuthorizationRecordStatus)
  status!: AuthorizationRecordStatus;
}
