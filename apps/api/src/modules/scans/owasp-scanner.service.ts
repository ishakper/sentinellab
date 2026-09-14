import { Injectable, Logger } from '@nestjs/common';

export interface OwaspScanParams {
  url: string;
  payloads?: any;
}

export interface OwaspScanResult {
  vulnerabilities: string[];
  passedChecks: string[];
  score: number;
}

@Injectable()
export class OwaspScannerService {
  private readonly logger = new Logger(OwaspScannerService.name);

  scanApi(params: OwaspScanParams): OwaspScanResult {
    this.logger.log(`Starting OWASP API Scan for target: ${params.url}`);

    const result: OwaspScanResult = {
      vulnerabilities: [],
      passedChecks: [],
      score: 100,
    };

    // IDOR / BOLA check simulation
    this.logger.log('Checking for Broken Object Level Authorization (BOLA/IDOR)...');
    if (params.url.includes('/api/users/1') || params.payloads?.userId) {
       result.vulnerabilities.push('BOLA/IDOR detected: Predictable resource identifiers in use without strict validation.');
       result.score -= 20;
    } else {
       result.passedChecks.push('No obvious BOLA vectors detected in URL structure.');
    }

    // Mass Assignment check simulation
    this.logger.log('Checking for Mass Assignment/Broken Object Property Level Authorization...');
    if (params.payloads && (params.payloads.isAdmin !== undefined || params.payloads.role !== undefined)) {
        result.vulnerabilities.push('Mass Assignment detected: Sensitive properties (isAdmin/role) can be modified.');
        result.score -= 15;
    } else {
        result.passedChecks.push('No Mass Assignment vectors detected in payloads.');
    }

    // SSRF protection & validation simulation
    this.logger.log('Checking for SSRF...');
    if (params.payloads?.webhookUrl || params.payloads?.importUrl) {
        result.vulnerabilities.push('Potential SSRF: User-controlled URL parameter without strict validation detected.');
        result.score -= 25;
    } else {
        result.passedChecks.push('No SSRF vectors detected.');
    }

    // File path traversal and magic byte validation
    this.logger.log('Checking for Path Traversal and File Upload flaws...');
    if (params.payloads?.filePath && (params.payloads.filePath.includes('../') || params.payloads.filePath.includes('..\\'))) {
        result.vulnerabilities.push('Path Traversal detected: ../ or ..\\ patterns found in input.');
        result.score -= 30;
    } else {
        result.passedChecks.push('No Path Traversal patterns detected.');
    }

    return result;
  }
}
