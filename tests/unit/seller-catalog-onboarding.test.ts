import { describe, expect, it, mock } from 'bun:test';
import { CatalogOnboardingService } from '@/features/catalog/services/onboarding-service';
import { OnboardingContentSchema, OnboardingProgressSchema } from '@/features/catalog/onboarding';
import { prisma } from '@/shared/database/prisma';

describe('Milestone 077 seller catalog onboarding', () => {
  it('validates localized template contracts', () => {
    expect(OnboardingContentSchema.safeParse({ templateKey: 'global:en-bd', locale: 'en-BD', name: 'General catalog', requiredFields: ['title'], recommendedFields: [], attributeGuidance: [], mediaGuidance: ['Use clear product images'], validationHints: [] }).success).toBe(true);
    expect(OnboardingContentSchema.safeParse({ templateKey: 'bad key', locale: 'en-BD', name: 'Invalid', requiredFields: [], recommendedFields: [], attributeGuidance: [], mediaGuidance: [], validationHints: [] }).success).toBe(false);
  });

  it('validates progress and rejects malformed checklist entries', () => {
    expect(OnboardingProgressSchema.safeParse({ templateId: 'obt_01', completedItems: ['title'] }).success).toBe(true);
    expect(OnboardingProgressSchema.safeParse({ templateId: 'obt_01', completedItems: [1] }).success).toBe(false);
  });

  it('calculates completion from required fields and preserves seller scope', async () => {
    const repository: any = {
      findTemplateById: mock(async () => ({ id: 'obt_01', version: 2, requiredFields: ['title', 'description'], recommendedFields: [], validationHints: [], mediaGuidance: [] })),
      saveProgress: mock(async (sellerId: string, input: any) => ({ id: 'obp_01', sellerId, ...input, template: { requiredFields: ['title', 'description'] } })),
    };
    const roles: any = { hasRole: mock(async () => false) };
    (prisma as any).seller = { findFirst: mock(async () => ({ ownerUserId: 'usr_owner' })) };
    (prisma as any).auditLog = { create: mock(async () => ({})) };
    const service = new CatalogOnboardingService(repository, roles);
    const result = await service.saveProgress('usr_owner', 'sel_01', { templateId: 'obt_01', completedItems: ['title'], dismissed: false });
    expect(result.sellerId).toBe('sel_01');
    expect(result.completionPercentage).toBe(50);
  });
});
