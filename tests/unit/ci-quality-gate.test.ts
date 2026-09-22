/**
 * Unit Tests for Baseline CI Quality Gate Workflow
 * Reference: Milestone 020
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import packageJson from '../../package.json';

describe('Milestone 020: Baseline CI Quality Gate', () => {
  const ciWorkflowPath = resolve(process.cwd(), '.github/workflows/ci.yml');
  const ciWorkflowContent = readFileSync(ciWorkflowPath, 'utf-8');

  describe('Workflow Triggers and Configuration', () => {
    it('triggers on push and pull_request to main and develop', () => {
      expect(ciWorkflowContent).toContain('push:');
      expect(ciWorkflowContent).toContain('pull_request:');
      expect(ciWorkflowContent).toContain('- main');
      expect(ciWorkflowContent).toContain('- develop');
    });

    it('uses oven-sh/setup-bun action', () => {
      expect(ciWorkflowContent).toContain('oven-sh/setup-bun@v2');
    });

    it('enforces concurrency cancel-in-progress', () => {
      expect(ciWorkflowContent).toContain('cancel-in-progress: true');
    });
  });

  describe('Verification Pipeline Steps', () => {
    it('includes format:check step', () => {
      expect(ciWorkflowContent).toContain('bun run format:check');
    });

    it('includes lint step', () => {
      expect(ciWorkflowContent).toContain('bun run lint');
    });

    it('includes typecheck step', () => {
      expect(ciWorkflowContent).toContain('bun run typecheck');
    });

    it('includes automated test suite step', () => {
      expect(ciWorkflowContent).toContain('bun run test');
    });

    it('includes openapi generation and validation step', () => {
      expect(ciWorkflowContent).toContain('bun run openapi');
    });

    it('includes production local build compilation step', () => {
      expect(ciWorkflowContent).toContain('bun run build:local');
    });
  });

  describe('Local CI Script Contract', () => {
    it('defines ci:check in package.json chaining all quality gates', () => {
      const scripts = packageJson.scripts as Record<string, string>;
      expect(scripts['ci:check']).toBeDefined();
      expect(scripts['ci:check']).toContain('format:check');
      expect(scripts['ci:check']).toContain('lint');
      expect(scripts['ci:check']).toContain('typecheck');
      expect(scripts['ci:check']).toContain('test');
      expect(scripts['ci:check']).toContain('openapi');
      expect(scripts['ci:check']).toContain('build:local');
    });
  });
});
