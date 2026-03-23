import { describe, expect, it } from 'vitest';
import { selectStoryArtwork, type AgentArmyStoryManifest } from './agent-army-artwork';

describe('selectStoryArtwork', () => {
  it('prefers real key art and scene assets for hero and cover surfaces', () => {
    const manifest: AgentArmyStoryManifest = {
      storyId: 'case-a',
      title: 'Case A',
      assets: [
        {
          asset_id: 'scene-1',
          asset_type: 'beat_scene_art',
          modality: 'image',
          title: 'Scene One',
          public_path: '/agent-army/case-a/scene-1.png'
        },
        {
          asset_id: 'hero-1',
          asset_type: 'story_key_art',
          modality: 'image',
          title: 'Hero',
          public_path: '/agent-army/case-a/hero-1.png'
        },
        {
          asset_id: 'evidence-1',
          asset_type: 'evidence_still',
          modality: 'image',
          title: 'Evidence',
          public_path: '/agent-army/case-a/evidence-1.png'
        }
      ],
      failures: []
    };

    const selection = selectStoryArtwork(manifest);
    expect(selection.hero?.asset_id).toBe('hero-1');
    expect(selection.cover?.asset_id).toBe('hero-1');
    expect(selection.scenes.map((asset) => asset.asset_id)).toContain('scene-1');
    expect(selection.evidence.map((asset) => asset.asset_id)).toContain('evidence-1');
  });

  it('ignores non-image assets and null public paths', () => {
    const manifest: AgentArmyStoryManifest = {
      storyId: 'case-b',
      title: 'Case B',
      assets: [
        {
          asset_id: 'audio-1',
          asset_type: 'title_theme',
          modality: 'audio',
          title: 'Theme',
          public_path: '/agent-army/case-b/theme.wav'
        },
        {
          asset_id: 'missing-image',
          asset_type: 'story_key_art',
          modality: 'image',
          title: 'Missing',
          public_path: null
        }
      ],
      failures: [{ asset_id: 'missing-image', asset_type: 'story_key_art', modality: 'image', generation_status: 'failed', error: 'blocked' }]
    };

    const selection = selectStoryArtwork(manifest);
    expect(selection.hero).toBeNull();
    expect(selection.cover).toBeNull();
    expect(selection.verifiedImageCount).toBe(0);
    expect(selection.issueCount).toBe(1);
  });
});
