import { describe, expect, it } from 'vitest';
import { buildCommercialAssetPlan, createManifestEntry, validateCommercialAssetPlan } from './index';

describe('media pipeline', () => {
  it('creates manifest entry with hash', () => {
    const entry = createManifestEntry({
      id: 'portrait-1',
      type: 'character_portrait',
      prompt: 'Weathered detective portrait, 35mm film grain',
      provider: 'openai',
      outputKey: 'assets/portrait-1.png'
    });

    expect(entry.promptHash.length).toBeGreaterThan(8);
  });

  it('builds commercial asset plans for website and stories', () => {
    const plan = buildCommercialAssetPlan({
      storyIds: ['midnight-lockbox'],
      websitePrompts: [
        {
          id: 'web-landing-hero',
          type: 'ui_background',
          prompt: 'Premium horror landing hero',
          outputKey: 'assets/production/web/landing-hero-v1.png'
        }
      ],
      storyTemplates: [
        {
          type: 'character_portrait',
          count: 2,
          promptTemplate: 'Character portrait for {story_id}.'
        },
        {
          type: 'scene_art',
          count: 1,
          promptTemplate: 'Scene art for {story_id}.'
        }
      ]
    });

    expect(plan.length).toBe(4);
    expect(plan.some((entry) => entry.scope === 'website')).toBe(true);
    expect(plan.some((entry) => entry.scope === 'story' && entry.storyId === 'midnight-lockbox')).toBe(true);
  });

  it('flags duplicate ids in commercial plans', () => {
    const validation = validateCommercialAssetPlan([
      {
        id: 'dup',
        type: 'promo_image',
        prompt: 'A',
        promptHash: 'x',
        revision: 1,
        generatedAt: new Date().toISOString(),
        provider: 'openai-images',
        outputKey: 'a.png',
        scope: 'website',
        storyId: null,
        providerChain: ['openai-images'],
        qualityGates: [
          'brand_compliance_passed',
          'accessibility_contrast_passed',
          'narrative_coherence_passed',
          'rights_and_provenance_verified'
        ]
      },
      {
        id: 'dup',
        type: 'promo_image',
        prompt: 'B',
        promptHash: 'y',
        revision: 1,
        generatedAt: new Date().toISOString(),
        provider: 'openai-images',
        outputKey: 'b.png',
        scope: 'story',
        storyId: 'midnight-lockbox',
        providerChain: ['openai-images'],
        qualityGates: [
          'brand_compliance_passed',
          'accessibility_contrast_passed',
          'narrative_coherence_passed',
          'rights_and_provenance_verified'
        ]
      }
    ]);

    expect(validation.valid).toBe(false);
    expect(validation.duplicateIds).toEqual(['dup']);
  });
});
