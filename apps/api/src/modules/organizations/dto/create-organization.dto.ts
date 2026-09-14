import { IsNotEmpty, IsString, MaxLength, IsOptional, IsInt, Min, Matches, IsObject } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens (e.g. acme-corp)',
  })
  slug: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxDevices?: number = 50;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number = 10;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any> = {};
}
