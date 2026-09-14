import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

/**
 * Result returned by the sliding-window rate limiter.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  currentCount: number;
}

/**
 * Lua script for atomic sliding-window rate limiting using Redis sorted sets (ZSET).
 * Keys:
 *   KEYS[1] = Rate limit key
 * Arguments:
 *   ARGV[1] = Current timestamp in milliseconds (now)
 *   ARGV[2] = Sliding window size in milliseconds
 *   ARGV[3] = Max limit allowed in window
 *   ARGV[4] = Key expiration TTL in seconds
 *   ARGV[5] = Unique request member identifier
 */
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])
local member = ARGV[5]

local clearBefore = now - window
redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
local currentCount = redis.call('ZCARD', key)

if currentCount < limit then
    redis.call('ZADD', key, now, member)
    redis.call('EXPIRE', key, ttl)
    return {1, limit - currentCount - 1, currentCount + 1}
else
    return {0, 0, currentCount}
end
`;

/**
 * Production-grade Redis service providing:
 * - Connection lifecycle management with auto-reconnect
 * - Sliding-window rate limiting (atomic via Lua)
 * - Token caching & blacklisting (revocation)
 * - Real-time device & agent presence tracking
 * - Pub/Sub messaging with dedicated subscriber client
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private subscriberClient!: Redis;
  private readonly subscriptions = new Map<string, Set<(message: string) => void>>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisOptions = this.getRedisOptions();

    // 1. Initialize primary Redis client
    this.client = new Redis(redisOptions);
    this.setupClientEvents(this.client, 'Primary');

    // 2. Initialize dedicated subscriber client (Redis requires dedicated connection for Pub/Sub)
    this.subscriberClient = new Redis(redisOptions);
    this.setupClientEvents(this.subscriberClient, 'Subscriber');

    // 3. Handle incoming Pub/Sub messages
    this.subscriberClient.on('message', (channel: string, message: string) => {
      const callbacks = this.subscriptions.get(channel);
      if (callbacks) {
        callbacks.forEach((cb) => {
          try {
            cb(message);
          } catch (err) {
            this.logger.error(`Error in Pub/Sub callback for channel [${channel}]:`, (err as Error).stack);
          }
        });
      }
    });

    try {
      await Promise.all([this.client.ping(), this.subscriberClient.ping()]);
      this.logger.log('Redis connections established successfully');
    } catch (err) {
      this.logger.warn(`Redis initial ping warning: ${(err as Error).message}. Will retry automatically.`);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Gracefully closing Redis connections...');
    try {
      this.subscriptions.clear();
      await Promise.all([this.client.quit(), this.subscriberClient.quit()]);
      this.logger.log('Redis connections closed.');
    } catch (err) {
      this.logger.error('Error closing Redis connections:', (err as Error).message);
    }
  }

  // ─── Key-Value Operations ───────────────────────────────────

  /**
   * Set a key-value pair with optional TTL in seconds.
   */
  async set(key: string, value: unknown, ttlSec?: number): Promise<void> {
    const serialized = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
    if (ttlSec && ttlSec > 0) {
      await this.client.set(key, serialized, 'EX', ttlSec);
    } else {
      await this.client.set(key, serialized);
    }
  }

  /**
   * Get and deserialize a value by key.
   */
  async get<T = string>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw === null) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  /**
   * Delete one or more keys.
   */
  async del(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      if (key.length === 0) return 0;
      return await this.client.del(...key);
    }
    return await this.client.del(key);
  }

  /**
   * Check if a key exists in Redis.
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Set expiration TTL on an existing key.
   */
  async expire(key: string, ttlSec: number): Promise<boolean> {
    const result = await this.client.expire(key, ttlSec);
    return result === 1;
  }

  // ─── Sliding-Window Rate Limiting ───────────────────────────

  /**
   * Atomic sliding-window rate limit using Redis Sorted Set and Lua script.
   *
   * @param key Unique identifier (e.g. `ratelimit:ip:127.0.0.1` or `ratelimit:tenant:org-uuid`)
   * @param limit Maximum requests permitted within the window
   * @param ttlSec Window duration in seconds
   */
  async slidingWindowRateLimit(key: string, limit: number, ttlSec: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = ttlSec * 1000;
    const member = `${now}:${Math.random().toString(36).substring(2, 10)}`;

    try {
      const result = (await this.client.eval(
        SLIDING_WINDOW_LUA,
        1,
        key,
        now,
        windowMs,
        limit,
        ttlSec,
        member,
      )) as [number, number, number];

      const allowed = result[0] === 1;
      const remaining = Math.max(0, result[1] ?? 0);
      const currentCount = result[2] ?? 0;
      const resetTime = Math.ceil((now + windowMs) / 1000);

      return {
        allowed,
        remaining,
        resetTime,
        currentCount,
      };
    } catch (err) {
      this.logger.error(`Sliding window rate limit error on key [${key}]:`, (err as Error).message);
      // Fail open or closed based on security posture: for defensive resilience, return current state
      return {
        allowed: true,
        remaining: 1,
        resetTime: Math.ceil((now + windowMs) / 1000),
        currentCount: 1,
      };
    }
  }

  // ─── Pub / Sub ──────────────────────────────────────────────

  /**
   * Publish a message to a Redis Pub/Sub channel.
   *
   * @param channel Channel name
   * @param message String or object payload
   * @returns Number of subscribers that received the message
   */
  async publish(channel: string, message: unknown): Promise<number> {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    return await this.client.publish(channel, payload);
  }

  /**
   * Subscribe to a Redis Pub/Sub channel.
   *
   * @param channel Channel name to listen to
   * @param callback Callback function invoked when message arrives
   * @returns Unsubscribe function to release the listener
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<() => Promise<void>> {
    let callbacks = this.subscriptions.get(channel);
    if (!callbacks) {
      callbacks = new Set();
      this.subscriptions.set(channel, callbacks);
      await this.subscriberClient.subscribe(channel);
      this.logger.debug(`Subscribed to Redis channel: [${channel}]`);
    }

    callbacks.add(callback);

    return async () => {
      const currentCallbacks = this.subscriptions.get(channel);
      if (currentCallbacks) {
        currentCallbacks.delete(callback);
        if (currentCallbacks.size === 0) {
          this.subscriptions.delete(channel);
          await this.subscriberClient.unsubscribe(channel);
          this.logger.debug(`Unsubscribed from Redis channel: [${channel}]`);
        }
      }
    };
  }

  // ─── Token Caching & Revocation ─────────────────────────────

  /**
   * Cache user authentication token metadata.
   */
  async cacheToken(userId: string, tokenId: string, ttlSec: number, metadata?: Record<string, unknown>): Promise<void> {
    const key = `auth:token:${userId}:${tokenId}`;
    await this.set(key, metadata || { cachedAt: new Date().toISOString() }, ttlSec);
  }

  /**
   * Blacklist / revoke a token by its JTI (JWT ID) or signature hash.
   */
  async blacklistToken(tokenId: string, ttlSec: number): Promise<void> {
    const key = `auth:blacklist:${tokenId}`;
    await this.set(key, { revokedAt: new Date().toISOString() }, ttlSec);
  }

  /**
   * Check whether a token has been blacklisted / revoked.
   */
  async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    return await this.exists(`auth:blacklist:${tokenId}`);
  }

  // ─── Presence Tracking ──────────────────────────────────────

  /**
   * Set presence status for a device or user agent.
   */
  async setPresence(
    entityType: 'device' | 'user',
    id: string,
    status: 'ONLINE' | 'OFFLINE',
    organizationId: string,
    ttlSec: number = 300,
  ): Promise<void> {
    const presenceKey = `presence:${entityType}:${id}`;
    const orgIndexKey = `presence:org:${organizationId}:${entityType}s`;

    if (status === 'ONLINE') {
      await this.set(presenceKey, { status, organizationId, lastSeen: Date.now() }, ttlSec);
      await this.client.sadd(orgIndexKey, id);
    } else {
      await this.del(presenceKey);
      await this.client.srem(orgIndexKey, id);
    }
  }

  /**
   * Retrieve active presence data for an entity.
   */
  async getPresence(entityType: 'device' | 'user', id: string): Promise<{ status: string; lastSeen: number } | null> {
    return await this.get<{ status: string; lastSeen: number }>(`presence:${entityType}:${id}`);
  }

  /**
   * Record a device heartbeat with battery and network telemetry.
   */
  async recordDeviceHeartbeat(
    deviceId: string,
    organizationId: string,
    metadata?: Record<string, unknown>,
    ttlSec: number = 90,
  ): Promise<void> {
    const key = `presence:device:${deviceId}`;
    const payload = {
      status: 'ONLINE',
      organizationId,
      lastSeen: Date.now(),
      ...metadata,
    };
    await this.set(key, payload, ttlSec);
    await this.client.sadd(`presence:org:${organizationId}:devices`, deviceId);
  }

  /**
   * Query all online device IDs for an organization.
   */
  async getOnlineDevices(organizationId: string): Promise<string[]> {
    const orgIndexKey = `presence:org:${organizationId}:devices`;
    const deviceIds = await this.client.smembers(orgIndexKey);
    if (!deviceIds || deviceIds.length === 0) {
      return [];
    }

    // Filter out expired devices that missed heartbeat
    const activeDeviceIds: string[] = [];
    for (const deviceId of deviceIds) {
      const exists = await this.exists(`presence:device:${deviceId}`);
      if (exists) {
        activeDeviceIds.push(deviceId);
      } else {
        // Cleanup stale set entry
        await this.client.srem(orgIndexKey, deviceId);
      }
    }

    return activeDeviceIds;
  }

  // ─── Direct Client Access & Utilities ───────────────────────

  /**
   * Direct access to underlying ioredis command client.
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Direct access to dedicated ioredis subscriber client.
   */
  getSubscriber(): Redis {
    return this.subscriberClient;
  }

  /**
   * Ping Redis server to verify connectivity.
   */
  async ping(): Promise<string> {
    return await this.client.ping();
  }

  // ─── Private Helpers ────────────────────────────────────────

  private getRedisOptions(): RedisOptions {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      return {
        lazyConnect: false,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => Math.min(times * 100, 3000),
      };
    }

    return {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      db: this.configService.get<number>('REDIS_DB', 0),
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
    };
  }

  private setupClientEvents(client: Redis, label: string): void {
    client.on('connect', () => {
      this.logger.log(`Redis [${label}] connected`);
    });

    client.on('ready', () => {
      this.logger.log(`Redis [${label}] ready`);
    });

    client.on('error', (err) => {
      this.logger.error(`Redis [${label}] connection error:`, err.message);
    });

    client.on('close', () => {
      this.logger.warn(`Redis [${label}] connection closed`);
    });

    client.on('reconnecting', (time: number) => {
      this.logger.log(`Redis [${label}] reconnecting in ${time}ms`);
    });
  }
}
