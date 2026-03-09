import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

interface CreativeAsset {
  id: string;
  type: string;
  scope: string;
  storyId: string | null;
  prompt: string;
  revision: number;
  qualityGates: string[];
}

interface ManifestShape {
  version: string;
  generatedAt: string;
  totals: {
    stories: number;
    websiteAssets: number;
    storyAssets: number;
    allAssets: number;
  };
  assets: CreativeAsset[];
}

async function loadManifest(): Promise<ManifestShape | null> {
  try {
    const repoRoot = process.cwd();
    const file = join(repoRoot, 'assets', 'manifests', 'commercial-creative-plan.json');
    const raw = await readFile(file, 'utf8');
    return JSON.parse(raw) as ManifestShape;
  } catch {
    return null;
  }
}

function previewPath(asset: CreativeAsset): string {
  if (asset.storyId) {
    return `/creative/stories/${asset.storyId}/${asset.id}.png`;
  }
  return `/creative/website/${asset.id}.png`;
}

export default async function ArtworkPage(): Promise<JSX.Element> {
  const manifest = await loadManifest();
  const assets = manifest?.assets ?? [];
  const featureCards = assets.slice(0, 36);

  return (
    <main className="container page-stack">
      <section className="panel section-shell">
        <p className="kicker">Commercial Creative Suite</p>
        <h1 className="section-title">Artwork Production Gallery</h1>
        <p className="section-copy">
          This gallery surfaces generated commercial assets from the managed manifest, including website
          surfaces, story portraits, scene art, evidence images, promo cards, and social creatives.
        </p>
        <div className="metric-strip">
          <article className="metric">
            <strong>{manifest?.totals.allAssets ?? 0}</strong>
            <span>Total planned assets</span>
          </article>
          <article className="metric">
            <strong>{manifest?.totals.storyAssets ?? 0}</strong>
            <span>Story creative assets</span>
          </article>
          <article className="metric">
            <strong>{manifest?.totals.websiteAssets ?? 0}</strong>
            <span>Website conversion assets</span>
          </article>
        </div>
      </section>

      <section className="panel section-shell">
        <h2 style={{ marginTop: 0 }}>Visual Validation</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Visual validation report is generated at <code>docs/design/visual-validation-report.md</code>.
        </p>
        <div className="inline-links">
          <a href="/library">Review story cards in live runtime</a>
          <a href="/play">Review in-session visuals with gameplay overlays</a>
        </div>
      </section>

      <section className="panel section-shell">
        <h2 style={{ marginTop: 0 }}>Asset Samples</h2>
        <div className="library-grid">
          {featureCards.map((asset) => (
            <article key={asset.id} className="library-card">
              <img src={previewPath(asset)} alt={`${asset.id} preview`} loading="lazy" />
              <div>
                <h2>{asset.id}</h2>
                <p className="story-subgenre">{asset.type.replaceAll('_', ' ')}</p>
                <p className="muted">{asset.prompt}</p>
                <p className="warning-line">
                  Scope: {asset.scope}
                  {asset.storyId ? ` - ${asset.storyId}` : ' - website'}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
