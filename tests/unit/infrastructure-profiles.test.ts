/**
 * Unit Tests for Remote Infrastructure & Object Storage Configurations
 */

import { describe, it, expect } from 'bun:test';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { serverEnvSchema } from '@/shared/config/environment';

describe('Remote Infrastructure & Object Storage Configuration', () => {
  it('confirms docker-compose.yml is removed for remote infra deployment', () => {
    const composePath = resolve(process.cwd(), 'docker-compose.yml');
    expect(existsSync(composePath)).toBe(false);
  });

  it('validates AWS S3 and Cloudflare R2 object storage provider schemas', () => {
    const baseEnv = {
      DATABASE_URL: 'postgresql://user:pass@remote-host:5432/db',
      REDIS_URL: 'redis://localhost:6379/0',
      JWT_SECRET: 'change_me_to_a_secure_random_string_in_production_min_32_chars',
      SESSION_SECRET: 'change_me_to_another_secure_random_string_32_chars',
    };

    const s3Config = serverEnvSchema.parse({
      ...baseEnv,
      STORAGE_PROVIDER: 'AWS_S3',
      S3_BUCKET_NAME: 'alifworld-media',
      S3_REGION: 'us-east-1',
    });
    expect(s3Config.STORAGE_PROVIDER).toBe('AWS_S3');
    expect(s3Config.S3_BUCKET_NAME).toBe('alifworld-media');

    const r2Config = serverEnvSchema.parse({
      ...baseEnv,
      STORAGE_PROVIDER: 'CLOUDFLARE_R2',
      S3_BUCKET_NAME: 'r2-media-bucket',
      R2_ACCOUNT_ID: '0123456789abcdef',
    });
    expect(r2Config.STORAGE_PROVIDER).toBe('CLOUDFLARE_R2');
    expect(r2Config.R2_ACCOUNT_ID).toBe('0123456789abcdef');
  });
});
