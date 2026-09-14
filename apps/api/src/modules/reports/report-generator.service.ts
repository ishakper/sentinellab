import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityReport, SecurityReportType } from '../../database/entities/security-report.entity';
import { Vulnerability } from '../../database/entities/vulnerability.entity';
import { VulnerabilityStatus } from '@sentinel/shared-types';

export interface GenerateReportDto {
  title: string;
  reportType: 'EXECUTIVE_SUMMARY' | 'TECHNICAL_DETAIL';
}

@Injectable()
export class ReportGeneratorService {
  constructor(
    @InjectRepository(SecurityReport)
    private readonly reportRepository: Repository<SecurityReport>,
    @InjectRepository(Vulnerability)
    private readonly vulnerabilityRepository: Repository<Vulnerability>,
  ) {}

  async generateReport(dto: GenerateReportDto, currentUser: any) {
    const { title, reportType } = dto;
    const organizationId = currentUser.organizationId;

    const vulnerabilities = await this.vulnerabilityRepository.find({
      where: { organizationId, status: VulnerabilityStatus.OPEN },
    });

    const severityCounts: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFORMATIONAL: 0,
    };

    let totalRiskScore = 0;

    vulnerabilities.forEach((vuln) => {
      const severity = vuln.severity?.toUpperCase() || 'INFORMATIONAL';
      if (severityCounts[severity] !== undefined) {
        severityCounts[severity] = (severityCounts[severity] || 0) + 1;
      } else {
        severityCounts[severity] = 1;
      }
      totalRiskScore += Number(vuln.cvssScore) || 0;
    });

    const averageRiskScore =
      vulnerabilities.length > 0 ? parseFloat((totalRiskScore / vulnerabilities.length).toFixed(2)) : 0;
    
    const critCount = severityCounts.CRITICAL || 0;
    const highCount = severityCounts.HIGH || 0;
    const medCount = severityCounts.MEDIUM || 0;

    let overallRisk = 'LOW';
    if (averageRiskScore >= 7.0 || critCount > 0) {
      overallRisk = 'CRITICAL';
    } else if (averageRiskScore >= 4.0 || highCount > 0) {
      overallRisk = 'HIGH';
    } else if (averageRiskScore >= 2.0 || medCount > 0) {
      overallRisk = 'MEDIUM';
    }

    const reportContent = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: currentUser.id,
        organizationId,
        overallRiskLevel: overallRisk,
      },
      vulnerabilitySummary: {
        critical: critCount,
        high: highCount,
        medium: medCount,
        low: severityCounts.LOW || 0,
        informational: severityCounts.INFORMATIONAL || 0,
      },
      vulnerabilities: vulnerabilities.map((v) => ({
        id: v.id,
        title: v.title,
        severity: v.severity,
        cvssScore: v.cvssScore,
        affectedAsset: v.affectedAsset,
        remediation: v.remediation,
      })),
    };

    const report = this.reportRepository.create({
      title,
      reportType: reportType === 'EXECUTIVE_SUMMARY' ? SecurityReportType.EXECUTIVE_SUMMARY : SecurityReportType.TECHNICAL_DETAIL,
      generatedBy: currentUser.id,
      organizationId,
      vulnerabilitySummary: reportContent.vulnerabilitySummary,
      overallRiskScore: averageRiskScore,
      pdfFilePath: null,
    });

    const saved = await this.reportRepository.save(report);

    return {
      success: true,
      data: {
        id: saved.id,
        title: saved.title,
        reportType: saved.reportType,
        overallRiskScore: saved.overallRiskScore,
        summary: saved.vulnerabilitySummary,
        content: reportContent,
        createdAt: saved.createdAt,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async findAll(currentUser: any) {
    const reports = await this.reportRepository.find({
      where: { organizationId: currentUser.organizationId },
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: reports,
      timestamp: new Date().toISOString(),
    };
  }

  async findOne(id: string, currentUser: any) {
    const report = await this.reportRepository.findOne({
      where: { id, organizationId: currentUser.organizationId },
    });

    if (!report) {
      throw new NotFoundException(`Report ${id} not found`);
    }

    return {
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    };
  }
}
