import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PairingService, DeviceRegistrationDto } from './pairing.service';
import { DevicesService } from './devices.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@sentinel/shared-types';

@ApiTags('Devices')
@Controller('devices')
export class DevicesController {
  constructor(
    private readonly pairingService: PairingService,
    private readonly devicesService: DevicesService,
  ) {}

  @ApiBearerAuth('access-token')
  @Post('pair')
  @Roles(UserRole.ADMIN, UserRole.SUPPORT_AGENT, UserRole.SUPER_ADMIN)
  async pairDevice(@CurrentUser() currentUser: AuthenticatedUser) {
    const { organizationId, id: requestedBy } = currentUser;
    return this.pairingService.generatePairingToken(organizationId, requestedBy);
  }

  @Public()
  @Post('register')
  async registerDevice(@Body() dto: DeviceRegistrationDto) {
    return this.pairingService.verifyAndRegisterDevice(dto);
  }

  @Get()
  async findAll(@Query() query: any, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.devicesService.findAll(query, currentUser);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.devicesService.findOne(id, currentUser);
  }

  @Post(':id/unpair')
  @Roles(UserRole.ADMIN, UserRole.SUPPORT_AGENT, UserRole.SUPER_ADMIN)
  async unpairDevice(@Param('id') id: string, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.devicesService.unpairDevice(id, currentUser);
  }
}
