export interface AgentArmyAssetEntry {
  asset_id: string;
  asset_type: string;
  modality: string;
  title: string;
  public_path: string | null;
  public_thumbnail_path?: string | null;
  tool_used?: string | null;
}

export interface AgentArmyStoryFailure {
  asset_id: string;
  asset_type: string;
  modality: string;
  generation_status: string;
  error: string;
}

export interface AgentArmyStoryManifest {
  storyId: string;
  title: string;
  assets: AgentArmyAssetEntry[];
  failures: AgentArmyStoryFailure[];
}

export interface StoryArtworkSelection {
  hero: AgentArmyAssetEntry | null;
  cover: AgentArmyAssetEntry | null;
  scenes: AgentArmyAssetEntry[];
  evidence: AgentArmyAssetEntry[];
  portraits: AgentArmyAssetEntry[];
  gallery: AgentArmyAssetEntry[];
  issueCount: number;
  verifiedImageCount: number;
}

const HERO_PRIORITY = ['story_key_art', 'arc_key_art', 'beat_scene_art', 'ending_card', 'page_banner'];
const COVER_PRIORITY = ['story_key_art', 'beat_scene_art', 'arc_key_art', 'ending_card', 'page_banner'];
const SCENE_TYPES = new Set(['story_key_art', 'arc_key_art', 'beat_scene_art', 'page_banner', 'background_texture']);
const EVIDENCE_TYPES = new Set(['evidence_still', 'puzzle_board', 'puzzle_shard_card']);
const PORTRAIT_TYPES = new Set(['character_portrait', 'villain_portrait']);

function assetPriority(assetType: string, priorityList: string[]): number {
  const index = priorityList.indexOf(assetType);
  return index >= 0 ? index : priorityList.length + 1;
}

function sortByTitle(left: AgentArmyAssetEntry, right: AgentArmyAssetEntry): number {
  return left.title.localeCompare(right.title);
}

function dedupeById(assets: AgentArmyAssetEntry[]): AgentArmyAssetEntry[] {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    if (seen.has(asset.asset_id)) {
      return false;
    }
    seen.add(asset.asset_id);
    return true;
  });
}

export function selectStoryArtwork(
  manifest: AgentArmyStoryManifest | null | undefined
): StoryArtworkSelection {
  const imageAssets = dedupeById(
    (manifest?.assets ?? [])
      .filter((asset) => asset.modality === 'image' && Boolean(asset.public_path))
      .sort(sortByTitle)
  );

  const hero = [...imageAssets].sort(
    (left, right) =>
      assetPriority(left.asset_type, HERO_PRIORITY) - assetPriority(right.asset_type, HERO_PRIORITY)
  )[0] ?? null;

  const cover = [...imageAssets].sort(
    (left, right) =>
      assetPriority(left.asset_type, COVER_PRIORITY) - assetPriority(right.asset_type, COVER_PRIORITY)
  )[0] ?? null;

  const scenes = imageAssets.filter((asset) => SCENE_TYPES.has(asset.asset_type)).slice(0, 6);
  const evidence = imageAssets.filter((asset) => EVIDENCE_TYPES.has(asset.asset_type)).slice(0, 6);
  const portraits = imageAssets.filter((asset) => PORTRAIT_TYPES.has(asset.asset_type)).slice(0, 6);
  const gallery = dedupeById([
    ...(hero ? [hero] : []),
    ...scenes,
    ...evidence,
    ...portraits
  ]).slice(0, 9);

  return {
    hero,
    cover,
    scenes,
    evidence,
    portraits,
    gallery,
    issueCount: manifest?.failures.length ?? 0,
    verifiedImageCount: imageAssets.length
  };
}
