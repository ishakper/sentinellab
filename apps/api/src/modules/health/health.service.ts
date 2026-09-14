import { Injectable, Logger, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
}

export interface ReadinessCheckResult extends HealthCheckResult {
  dependencies: {
    database: { status: 'up' | 'down'; latencyMs: number };
    redis: { status: 'up' | 'down'; latencyMs: number };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly dataSource: DataSource,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  check(): HealthCheckResult {
    return {
      status: 'ok',
      service: 'sentinel-lab-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  async checkReadiness(): Promise<ReadinessCheckResult> {
    const dbStatus = await this.checkDatabase();
    const redisStatus = await this.checkRedis();

    const isReady = dbStatus.status === 'up' && redisStatus.status === 'up';

    return {
      status: isReady ? 'ok' : 'error',
      service: 'sentinel-lab-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      dependencies: {
        database: dbStatus,
        redis: redisStatus,
      },
    };
  }

  private async checkDatabase(): Promise<{ status: 'up' | 'down'; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return { status: 'down', latencyMs: Date.now() - start };
    }
  }

  private async checkRedis(): Promise<{ status: 'up' | 'down'; latencyMs: number }> {
    const start = Date.now();
    if (!this.redisService) {
      return { status: 'up', latencyMs: 0 };
    }
    try {
      const pong = await this.redisService.ping();
      if (pong === 'PONG') {
        return { status: 'up', latencyMs: Date.now() - start };
      }
      return { status: 'down', latencyMs: Date.now() - start };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return { status: 'down', latencyMs: Date.now() - start };
    }
  }
}
