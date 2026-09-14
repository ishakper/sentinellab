import { Controller, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new organization administrator' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'User already exists or invalid data' })
  async register(@Body() dto: any) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or MFA required' })
  async login(@Body() dto: any) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate and refresh JWT access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or revoked refresh token' })
  async refresh(@Body() dto: any) {
    return this.authService.refreshToken(dto);
  }

  @ApiBearerAuth('access-token')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout and revoke active session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Req() req: any, @Body() body: { refreshToken: string }) {
    return this.authService.logout(req.user.id, body.refreshToken);
  }

  @ApiBearerAuth('access-token')
  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate TOTP MFA secret and QR code' })
  @ApiResponse({ status: 200, description: 'MFA setup details generated' })
  async setupMfa(@Req() req: any) {
    return this.authService.setupMfa(req.user.id);
  }

  @ApiBearerAuth('access-token')
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify code and enable MFA' })
  @ApiResponse({ status: 200, description: 'MFA enabled' })
  @ApiResponse({ status: 401, description: 'Invalid MFA code' })
  async verifyMfa(@Req() req: any, @Body() body: { code: string }) {
    return this.authService.verifyAndEnableMfa(req.user.id, body.code);
  }

  @ApiBearerAuth('access-token')
  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable MFA for account' })
  @ApiResponse({ status: 200, description: 'MFA disabled' })
  async disableMfa(@Req() req: any) {
    return this.authService.disableMfa(req.user.id);
  }
}
