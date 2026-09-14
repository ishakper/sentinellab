import { Module } from '@nestjs/common';
import { ApkAuditorService } from './apk-auditor.service';
import { OwaspScannerService } from './owasp-scanner.service';
import { ScansController } from './scans.controller';

@Module({
  controllers: [ScansController],
  providers: [ApkAuditorService, OwaspScannerService],
  exports: [ApkAuditorService, OwaspScannerService],
})
export class ScansModule {}
