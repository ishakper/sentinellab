import { Controller, Post, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@sentinel/shared-types';

@ApiTags('Support')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @ApiBearerAuth('access-token')
  @Roles(UserRole.SUPPORT_AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request controlled remote support session' })
  @ApiResponse({ status: 201, description: 'Support session requested, pending device consent' })
  async requestSession(
    @Body() body: { deviceId: string; reason: string },
    @CurrentUser() currentUser: any,
  ) {
    return this.supportService.requestSession(body.deviceId, body.reason, currentUser);
  }

  @Public()
  @Post('sessions/:id/consent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grant or deny device user consent' })
  @ApiParam({ name: 'id', description: 'Support session UUID' })
  async handleConsent(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body() body: { deviceId: string; granted: boolean },
  ) {
    if (body.granted) {
      return this.supportService.grantConsent(sessionId, body.deviceId);
    }
    return this.supportService.denyConsent(sessionId);
  }

  @Public()
  @Post('sessions/:id/terminate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger one-touch kill switch to instantly terminate remote support session' })
  @ApiParam({ name: 'id', description: 'Support session UUID' })
  async terminateSession(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body() body: { triggeredBy?: 'USER' | 'AGENT' },
  ) {
    return this.supportService.terminateSession(sessionId, body.triggeredBy || 'USER');
  }
}
