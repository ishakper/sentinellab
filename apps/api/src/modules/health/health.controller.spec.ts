import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DataSource } from 'typeorm';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  const mockDataSource = {
    query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('health', () => {
    it('should return ok status', () => {
      const result = controller.health();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('sentinel-lab-api');
      expect(result.version).toBe('1.0.0');
      expect(result.timestamp).toBeDefined();
      expect(typeof result.uptime).toBe('number');
    });
  });

  describe('ready', () => {
    it('should return readiness with dependency status', async () => {
      const result = await controller.ready();
      expect(result.status).toBe('ok');
      expect(result.dependencies).toBeDefined();
      expect(result.dependencies.database.status).toBe('up');
    });

    it('should report database down on error', async () => {
      mockDataSource.query.mockRejectedValueOnce(new Error('Connection refused'));
      const result = await controller.ready();
      expect(result.status).toBe('error');
      expect(result.dependencies.database.status).toBe('down');
    });
  });
});
