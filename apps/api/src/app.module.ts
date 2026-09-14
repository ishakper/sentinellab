import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Core & Infrastructure Modules
import { RedisModule } from './common/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { ENTITIES } from './database/entities';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { AuditModule } from './modules/audit/audit.module';
import { DevicesModule } from './modules/devices/devices.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { SupportModule } from './modules/support/support.module';
import { ScansModule } from './modules/scans/scans.module';
import { LabModule } from './modules/lab/lab.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ResearchProjectsModule } from './modules/research-projects/research-projects.module';

// Guards
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';

// Middlewares
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Redis Cache & Pub/Sub
    RedisModule,

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DATABASE_HOST', 'localhost'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get<string>('DATABASE_USER', 'sentinel'),
        password: configService.get<string>('DATABASE_PASSWORD', 'sentinel_secure_password_change_me'),
        database: configService.get<string>('DATABASE_NAME', 'sentinel_lab'),
        entities: ENTITIES,
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        logging: configService.get<string>('NODE_ENV') === 'development' ? ['error', 'warn'] : ['error'],
        ssl: configService.get<string>('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        extra: {
          min: configService.get<number>('DATABASE_POOL_MIN', 2),
          max: configService.get<number>('DATABASE_POOL_MAX', 10),
        },
      }),
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('RATE_LIMIT_TTL', 60) * 1000,
            limit: configService.get<number>('RATE_LIMIT_MAX', 100),
          },
        ],
      }),
    }),

    // Feature Modules
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    AuditModule,
    DevicesModule,
    GatewayModule,
    SupportModule,
    ScansModule,
    LabModule,
    ReportsModule,
    ResearchProjectsModule,
  ],
  providers: [
    // 1. Global Rate Limiter
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // 2. Global JWT Authentication Guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // 3. Global Role-Based Access Control Guard
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // 4. Global Tenant Isolation Guard
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, LoggingMiddleware, TenantContextMiddleware)
      .forRoutes('*');
  }
}
