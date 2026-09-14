import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthorizationRecordsService, UploadedDocument } from './authorization-records.service';
import { CreateAuthorizationRecordDto } from './dto/create-authorization-record.dto';
import { UpdateAuthorizationRecordDto } from './dto/update-authorization-record.dto';

@ApiTags('Authorization Records')
@ApiBearerAuth('access-token')
@Controller('authorization-records')
export class AuthorizationRecordsController {
  constructor(private readonly authorizationRecordsService: AuthorizationRecordsService) {}

  @Get()
  @ApiOperation({ summary: 'List authorization records for current organization' })
  findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.authorizationRecordsService.findAll(currentUser.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get authorization record for current organization' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.authorizationRecordsService.findOne(id, currentUser.organizationId);
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create authorization record and upload document' })
  @UseInterceptors(
    FileInterceptor('document', {
      limits: { fileSize: Number(process.env.MAX_FILE_SIZE_BYTES ?? 10 * 1024 * 1024) },
    }),
  )
  upload(
    @Body() dto: CreateAuthorizationRecordDto,
    @UploadedFile() file: UploadedDocument | undefined,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.authorizationRecordsService.upload(dto, file, currentUser.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update authorization record for current organization' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAuthorizationRecordDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.authorizationRecordsService.update(id, dto, currentUser.organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete authorization record for current organization' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.authorizationRecordsService.remove(id, currentUser.organizationId);
  }
}
