/**
 * Unit Tests for Bun Command Contract Enforcement
 * Reference: Milestone 017
 */

import { describe, it, expect } from 'bun:test';
import packageJson from '../../package.json';
import { openApiSpec } from '../../scripts/generate-openapi';

describe('Milestone 017: Bun Command Contract', () => {
  const scripts = packageJson.scripts as Record<string, string>;

  describe('Core Lifecycle Script Contract', () => {
    it('defines dev:local script', () => {
      expect(scripts['dev:local']).toBeDefined();
      expect(scripts['dev:local']).toContain('next dev');
    });

    it('defines dev:production script', () => {
      expect(scripts['dev:production']).toBeDefined();
      expect(scripts['dev:production']).toContain('next dev');
    });

    it('defines build:local script', () => {
      expect(scripts['build:local']).toBeDefined();
      expect(scripts['build:local']).toContain('next build');
    });

    it('defines build:production script', () => {
      expect(scripts['build:production']).toBeDefined();
      expect(scripts['build:production']).toContain('next build');
    });

    it('enforces production:production runs compiled output, NEVER next dev', () => {
      expect(scripts['production:production']).toBeDefined();
      expect(scripts['production:production']).not.toContain('next dev');
      expect(scripts['production:production']).toContain('next start');
    });
  });

  describe('Quality & Verification Script Contract', () => {
    it('defines lint with zero-warning ceiling', () => {
      expect(scripts['lint']).toBeDefined();
      expect(scripts['lint']).toContain('--max-warnings 0');
    });

    it('defines typecheck with noEmit', () => {
      expect(scripts['typecheck']).toBeDefined();
      expect(scripts['typecheck']).toContain('tsc --noEmit');
    });

    it('defines combined quality gate', () => {
      expect(scripts['quality']).toBeDefined();
      expect(scripts['quality']).toContain('bun run lint');
      expect(scripts['quality']).toContain('bun run typecheck');
    });

    it('defines formatting scripts', () => {
      expect(scripts['format']).toBeDefined();
      expect(scripts['format:check']).toBeDefined();
    });

    it('defines granular testing suite scripts', () => {
      expect(scripts['test']).toBeDefined();
      expect(scripts['test:unit']).toBeDefined();
      expect(scripts['test:integration']).toBeDefined();
      expect(scripts['test:e2e']).toBeDefined();
    });
  });

  describe('Database, Worker & OpenAPI Script Contract', () => {
    it('defines Prisma database operations', () => {
      expect(scripts['db:generate']).toBe('prisma generate');
      expect(scripts['db:migrate']).toBe('prisma migrate dev');
      expect(scripts['db:migrate:deploy']).toBe('prisma migrate deploy');
      expect(scripts['db:seed']).toContain('prisma/seed.ts');
      expect(scripts['db:studio']).toBe('prisma studio');
    });

    it('defines worker execution script', () => {
      expect(scripts['worker']).toBeDefined();
      expect(scripts['worker']).toContain('src/workers/index.ts');
    });

    it('defines openapi generator script and schema structure', () => {
      expect(scripts['openapi']).toBeDefined();
      expect(scripts['openapi']).toContain('scripts/generate-openapi.ts');
      expect(openApiSpec.openapi).toBe('3.1.0');
      expect(openApiSpec.info.title).toContain('AlifWorld');
      expect(openApiSpec.paths['/api/v1']).toBeDefined();
      expect(openApiSpec.paths['/api/health/live']).toBeDefined();
      expect(openApiSpec.paths['/api/health/ready']).toBeDefined();
    });
  });
});
