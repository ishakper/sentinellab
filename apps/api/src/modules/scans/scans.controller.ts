import { Controller, Post, Body, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApkAuditorService } from './apk-auditor.service';
import { OwaspScannerService } from './owasp-scanner.service';

@ApiTags('Scans')
@Controller('scans')
export class ScansController {
  constructor(
    private readonly apkAuditorService: ApkAuditorService,
    private readonly owaspScannerService: OwaspScannerService,
  ) {}

  @Post('apk')
  @ApiOperation({ summary: 'Run static APK AndroidManifest auditor' })
  @ApiResponse({ status: 200, description: 'Manifest vulnerability report generated' })
  @UseInterceptors(FileInterceptor('manifest'))
  async scanApk(@UploadedFile() manifest: any, @Body() body: any) {
    let manifestContent = '';

    if (manifest && manifest.buffer) {
      manifestContent = manifest.buffer.toString('utf-8');
    } else if (body && body.manifestContent) {
      manifestContent = body.manifestContent;
    } else {
      throw new BadRequestException('Manifest file or manifestContent body is required');
    }

    const report = this.apkAuditorService.auditManifest(manifestContent);
    return {
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('api')
  @ApiOperation({ summary: 'Run OWASP API vulnerability scan' })
  @ApiResponse({ status: 200, description: 'OWASP API scan report generated' })
  async scanApi(@Body() body: { url: string; payloads?: any }) {
    if (!body.url) {
      throw new BadRequestException('URL is required for API scanning');
    }
    const report = this.owaspScannerService.scanApi({ url: body.url, payloads: body.payloads });
    return {
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    };
  }
}
