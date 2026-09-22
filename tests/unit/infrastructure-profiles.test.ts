/**
 * Unit Tests for Local Development Infrastructure Profiles (Docker Compose)
 * Reference: Milestone 019
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import packageJson from '../../package.json';

describe('Milestone 019: Local Infrastructure Profiles', () => {
  const composePath = resolve(process.cwd(), 'docker-compose.yml');
  const composeContent = readFileSync(composePath, 'utf-8');

  describe('Service Definitions and Alignments', () => {
    it('defines PostgreSQL 16 service with exact .env.example credentials', () => {
      expect(composeContent).toContain('postgres:16-alpine');
      expect(composeContent).toContain('alifworld-postgres');
      expect(composeContent).toContain('POSTGRES_USER: alifworld');
      expect(composeContent).toContain('POSTGRES_PASSWORD: alifworld_local_secret');
      expect(composeContent).toContain('POSTGRES_DB: alifworld_dev');
      expect(composeContent).toContain('5432:5432');
      expect(composeContent).toContain('pg_isready -U alifworld -d alifworld_dev');
    });

    it('defines Redis 7 service with append-only persistence and ping healthcheck', () => {
      expect(composeContent).toContain('redis:7-alpine');
      expect(composeContent).toContain('alifworld-redis');
      expect(composeContent).toContain('6379:6379');
      expect(composeContent).toContain('redis-cli');
      expect(composeContent).toContain('ping');
    });

    it('defines MinIO S3-compatible service with bucket initialization', () => {
      expect(composeContent).toContain('minio/minio:latest');
      expect(composeContent).toContain('alifworld-minio');
      expect(composeContent).toContain('MINIO_ROOT_USER: minioadmin');
      expect(composeContent).toContain('MINIO_ROOT_PASSWORD: minioadmin');
      expect(composeContent).toContain('9000:9000');
      expect(composeContent).toContain('alifworld-media');
    });

    it('defines Meilisearch full-text search service with master key alignment', () => {
      expect(composeContent).toContain('getmeili/meilisearch:v1.10');
      expect(composeContent).toContain('alifworld-meilisearch');
      expect(composeContent).toContain('MEILI_MASTER_KEY: masterKey123');
      expect(composeContent).toContain('7700:7700');
      expect(composeContent).toContain('http://localhost:7700/health');
    });

    it('defines Mailpit SMTP and web inspector service', () => {
      expect(composeContent).toContain('axllent/mailpit:latest');
      expect(composeContent).toContain('1025:1025');
      expect(composeContent).toContain('8025:8025');
    });
  });

  describe('Profiles and Lifecycle Management', () => {
    it('configures core and full profiles', () => {
      expect(composeContent).toContain('profiles:');
      expect(composeContent).toContain('- core');
      expect(composeContent).toContain('- full');
    });

    it('provides infrastructure scripts in package.json', () => {
      const scripts = packageJson.scripts as Record<string, string>;
      expect(scripts['infra:up']).toBe('docker compose --profile full up -d');
      expect(scripts['infra:core']).toBe('docker compose --profile core up -d');
      expect(scripts['infra:down']).toBe('docker compose down');
      expect(scripts['infra:logs']).toBe('docker compose logs -f');
      expect(scripts['infra:reset']).toBe('docker compose down -v && docker compose --profile full up -d');
    });
  });
});
