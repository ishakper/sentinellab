import { Controller, Post, Get, Param, Body, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ReportGeneratorService, GenerateReportDto } from './report-generator.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportGeneratorService: ReportGeneratorService) {}

  @ApiBearerAuth('access-token')
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate executive or technical security report' })
  @ApiResponse({ status: 201, description: 'Security report generated' })
  async generateReport(@Body() dto: GenerateReportDto, @CurrentUser() currentUser: any) {
    return await this.reportGeneratorService.generateReport(dto, currentUser);
  }

  @ApiBearerAuth('access-token')
  @Get()
  @ApiOperation({ summary: 'List organization security reports' })
  @ApiResponse({ status: 200, description: 'Reports list retrieved' })
  async getReports(@CurrentUser() currentUser: any) {
    return await this.reportGeneratorService.findAll(currentUser);
  }

  @ApiBearerAuth('access-token')
  @Get(':id')
  @ApiOperation({ summary: 'Get report details by ID' })
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiResponse({ status: 200, description: 'Report details retrieved' })
  async getReportById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: any) {
    return await this.reportGeneratorService.findOne(id, currentUser);
  }
}
