import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const redisConfig = {
  connection: {
    url: redisUrl
  }
};

let redisClient: Redis | null = null;
let isRedisAvailable = false;

export async function checkRedisConnection(): Promise<boolean> {
  if (isRedisAvailable) return true;

  return new Promise((resolve) => {
    const tempClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null // Don't retry automatically during check
    });

    tempClient.on('connect', () => {
      isRedisAvailable = true;
      redisClient = tempClient;
      console.log('Successfully connected to Redis at:', redisUrl);
      resolve(true);
    });

    tempClient.on('error', (err) => {
      console.warn('Redis is not available. Background processing will run in asynchronous in-memory fallback mode.');
      tempClient.disconnect();
      isRedisAvailable = false;
      resolve(false);
    });
  });
}

export function getRedisClient(): Redis | null {
  return redisClient;
}

export function getIsRedisAvailable(): boolean {
  return isRedisAvailable;
}
