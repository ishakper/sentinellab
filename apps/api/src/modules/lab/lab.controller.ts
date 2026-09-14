import { Controller, Get, Post, Body } from '@nestjs/common';
import { LabSimulatorService } from './lab-simulator.service';

@Controller('api/v1/lab')
export class LabController {
  constructor(private readonly labSimulatorService: LabSimulatorService) {}

  @Get('targets')
  listTargets() {
    return {
      targets: [
        { id: 'LAB-ANDROID-001', status: 'running', type: 'android' },
        { id: 'LAB-VULN-API', status: 'running', type: 'api' }
      ]
    };
  }

  @Post('simulate')
  async triggerSimulation(@Body() body: { targetId: string, testType: string }) {
    return this.labSimulatorService.triggerSimulation(body.targetId, body.testType);
  }
}
