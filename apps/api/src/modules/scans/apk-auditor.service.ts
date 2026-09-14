import { Injectable, Logger } from '@nestjs/common';

export interface AuditResult {
  vulnerabilityScore: number;
  criticalIssues: string[];
  highIssues: string[];
  mediumIssues: string[];
  lowIssues: string[];
  findings: string[];
}

@Injectable()
export class ApkAuditorService {
  private readonly logger = new Logger(ApkAuditorService.name);

  auditManifest(manifestXmlContent: string): AuditResult {
    this.logger.log('Auditing APK Manifest for security vulnerabilities...');
    
    const result: AuditResult = {
      vulnerabilityScore: 0,
      criticalIssues: [],
      highIssues: [],
      mediumIssues: [],
      lowIssues: [],
      findings: [],
    };

    // Detect debuggable="true"
    if (manifestXmlContent.includes('android:debuggable="true"')) {
      result.criticalIssues.push('Application is debuggable (android:debuggable="true")');
      result.vulnerabilityScore += 10;
    }

    // Detect allowBackup="true"
    if (manifestXmlContent.includes('android:allowBackup="true"')) {
      result.mediumIssues.push('Application allows backup (android:allowBackup="true")');
      result.vulnerabilityScore += 4;
    }

    // Rough parsing for exported components without permissions
    // Activities
    const exportedActivitiesMatch = manifestXmlContent.match(/<activity[^>]*android:exported="true"[^>]*>/g);
    if (exportedActivitiesMatch) {
      exportedActivitiesMatch.forEach(activity => {
        if (!activity.includes('android:permission')) {
          result.highIssues.push(`Exported Activity without permission: ${activity}`);
          result.vulnerabilityScore += 7;
        }
      });
    }

    // Receivers
    const exportedReceiversMatch = manifestXmlContent.match(/<receiver[^>]*android:exported="true"[^>]*>/g);
    if (exportedReceiversMatch) {
      exportedReceiversMatch.forEach(receiver => {
        if (!receiver.includes('android:permission')) {
          result.highIssues.push(`Exported Receiver without permission: ${receiver}`);
          result.vulnerabilityScore += 7;
        }
      });
    }

    // Services
    const exportedServicesMatch = manifestXmlContent.match(/<service[^>]*android:exported="true"[^>]*>/g);
    if (exportedServicesMatch) {
      exportedServicesMatch.forEach(service => {
        if (!service.includes('android:permission')) {
          result.highIssues.push(`Exported Service without permission: ${service}`);
          result.vulnerabilityScore += 7;
        }
      });
    }

    // Scan for hardcoded secrets, API keys, etc 
    const awsKeyPattern = /AKIA[0-9A-Z]{16}/;
    if (awsKeyPattern.test(manifestXmlContent)) {
      result.criticalIssues.push('Hardcoded AWS Access Key ID found');
      result.vulnerabilityScore += 10;
    }

    const jwtPattern = /ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/;
    if (jwtPattern.test(manifestXmlContent)) {
      result.highIssues.push('Possible Hardcoded JWT Token found');
      result.vulnerabilityScore += 8;
    }

    result.findings.push(`Total Vulnerability Score: ${result.vulnerabilityScore}`);

    return result;
  }
}
