import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CatalogAsset {
  story_id: string;
  asset_id: string;
  asset_type: string;
  modality: 'image' | 'video' | 'audio' | 'artifact' | 'web';
  title: string;
  prompt_used: string;
  tool_used: string;
  generation_status: 'complete';
  file_path: string;
  public_path: string | null;
  thumbnail_path: string | null;
  public_thumbnail_path: string | null;
  created_at: string;
  checksum: string;
  file_size: number;
  duration_seconds: number | null;
}

interface CatalogFailure {
  story_id: string;
  asset_id: string;
  asset_type: string;
  modality: string;
  generation_status: 'missing' | 'invalid' | 'failed' | 'unavailable';
  error: string;
  planned_output_path: string;
  last_attempt_at: string | null;
}

interface CatalogStory {
  storyId: string;
  title: string;
  assets: CatalogAsset[];
  failures: CatalogFailure[];
}

interface ArtworkCatalog {
  generatedAt: string;
  planPath: string;
  stories: CatalogStory[];
  totals: {
    stories: number;
    completeAssets: number;
    failedAssets: number;
    unavailableAssets: number;
    invalidAssets: number;
    missingAssets: number;
  };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveCatalogPath(): Promise<string | null> {
  const cwd = process.cwd();
  const candidates = [
    join(cwd, 'public', 'agent-army', 'catalog.json'),
    join(cwd, 'apps', 'web', 'public', 'agent-army', 'catalog.json'),
    join(cwd, '..', 'public', 'agent-army', 'catalog.json')
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function loadCatalog(): Promise<ArtworkCatalog | null> {
  const catalogPath = await resolveCatalogPath();
  if (!catalogPath) {
    return null;
  }

  try {
    return JSON.parse(await readFile(catalogPath, 'utf8')) as ArtworkCatalog;
  } catch {
    return null;
  }
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }
  if (bytes >= 1_000) {
    return `${(bytes / 1_000).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function withVersion(path: string | null, checksum: string): string | undefined {
  if (!path) {
    return undefined;
  }

  const version = checksum.slice(0, 12);
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}v=${version}`;
}

function mediaPreview(asset: CatalogAsset): JSX.Element {
  if (asset.modality === 'image') {
    return (
      <img
        src={withVersion(asset.public_thumbnail_path ?? asset.public_path, asset.checksum)}
        alt={asset.title}
        loading="lazy"
      />
    );
  }

  if (asset.modality === 'video') {
    return (
      <video
        src={withVersion(asset.public_path, asset.checksum)}
        controls
        preload="metadata"
        style={{ width: '100%', borderRadius: 10, border: '1px solid #263145' }}
      />
    );
  }

  if (asset.modality === 'audio') {
    return (
      <div
        style={{
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          padding: 16,
          background: 'rgba(8, 11, 18, 0.72)'
        }}
      >
        <audio
          src={withVersion(asset.public_path, asset.checksum)}
          controls
          preload="metadata"
          style={{ width: '100%' }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12,
        padding: 16,
        background: 'rgba(8, 11, 18, 0.72)'
      }}
    >
      <p className="muted" style={{ margin: 0 }}>
        Direct file preview is not embedded for this asset type.
      </p>
    </div>
  );
}

export default async function ArtworkPage(): Promise<JSX.Element> {
  const catalog = await loadCatalog();

  if (!catalog) {
    return (
      <main className="container page-stack">
        <section className="panel section-shell">
          <p className="kicker">Generated Game Artwork</p>
          <h1 className="section-title">Artwork Gallery</h1>
          <p className="section-copy">
            Verified asset catalog was not found. Run <code>pnpm creative:materialize-agent-army</code> to
            generate assets, then reload this page.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="container page-stack">
      <section className="panel section-shell">
        <p className="kicker">Verified Generated Media</p>
        <h1 className="section-title">Artwork Gallery</h1>
        <p className="section-copy">
          This page only reads <code>apps/web/public/agent-army/catalog.json</code>. Assets appear here only
          after generation succeeded, the file exists, and validation passed.
        </p>
        <div className="metric-strip">
          <article className="metric">
            <strong>{catalog.totals.stories}</strong>
            <span>Stories</span>
          </article>
          <article className="metric">
            <strong>{catalog.totals.completeAssets}</strong>
            <span>Verified assets</span>
          </article>
          <article className="metric">
            <strong>{catalog.totals.missingAssets + catalog.totals.invalidAssets + catalog.totals.failedAssets}</strong>
            <span>Action required</span>
          </article>
          <article className="metric">
            <strong>{catalog.totals.unavailableAssets}</strong>
            <span>Unavailable</span>
          </article>
        </div>
      </section>

      {catalog.stories.map((story) => (
        <section key={story.storyId} className="panel section-shell">
          <h2 style={{ marginTop: 0 }}>{story.title}</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {story.assets.length} verified assets, {story.failures.length} generation issues
          </p>

          {story.assets.length > 0 ? (
            <div className="library-grid">
              {story.assets.map((asset) => (
                <article key={asset.asset_id} className="library-card">
                  {mediaPreview(asset)}
                  <div>
                    <h2 style={{ fontSize: '1.05rem' }}>{asset.title}</h2>
                    <p className="story-subgenre" style={{ marginBottom: 6 }}>
                      {asset.modality} / {asset.asset_type}
                    </p>
                    <p className="muted" style={{ margin: '0 0 6px' }}>
                      Tool: <code>{asset.tool_used}</code>
                    </p>
                    <p className="muted" style={{ margin: '0 0 6px' }}>
                      Size: <code>{formatBytes(asset.file_size)}</code>
                      {asset.duration_seconds ? <> / <code>{asset.duration_seconds.toFixed(2)}s</code></> : null}
                    </p>
                    <p className="muted" style={{ margin: '0 0 6px' }}>
                      File: <code>{asset.file_path}</code>
                    </p>
                    <p className="muted" style={{ margin: 0 }}>
                      {asset.public_path ? (
                        <a
                          href={withVersion(asset.public_path, asset.checksum)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open generated file
                        </a>
                      ) : (
                        'Public file path unavailable'
                      )}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">No verified assets for this story yet.</p>
          )}

          {story.failures.length > 0 ? (
            <div style={{ marginTop: 24 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  alignItems: 'center',
                  marginBottom: 12,
                  flexWrap: 'wrap'
                }}
              >
                <h3 style={{ margin: 0 }}>Failed or Missing Jobs</h3>
                <form action="/api/artwork/retry" method="post">
                  <input type="hidden" name="storyId" value={story.storyId} />
                  <button
                    type="submit"
                    style={{
                      borderRadius: 999,
                      border: '1px solid rgba(255,255,255,0.16)',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'inherit',
                      padding: '10px 14px',
                      cursor: 'pointer'
                    }}
                  >
                    Retry story generation
                  </button>
                </form>
              </div>
              <p className="muted" style={{ marginTop: 0 }}>
                Showing {Math.min(story.failures.length, 8)} of {story.failures.length} failures.
              </p>
              <div className="page-stack">
                {story.failures.slice(0, 8).map((failure) => (
                  <article
                    key={failure.asset_id}
                    className="panel"
                    style={{
                      padding: 16,
                      border: '1px solid rgba(188, 84, 84, 0.4)',
                      background: 'rgba(54, 18, 18, 0.22)'
                    }}
                  >
                    <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
                      {failure.asset_id} ({failure.modality})
                    </p>
                    <p className="muted" style={{ margin: '0 0 6px' }}>
                      Status: <code>{failure.generation_status}</code>
                    </p>
                    <p className="muted" style={{ margin: '0 0 6px' }}>
                      Planned path: <code>{failure.planned_output_path}</code>
                    </p>
                    <p className="muted" style={{ margin: '0 0 12px' }}>
                      Error: <code>{failure.error}</code>
                    </p>
                    {failure.generation_status !== 'unavailable' ? (
                      <form action="/api/artwork/retry" method="post">
                        <input type="hidden" name="storyId" value={failure.story_id} />
                        <input type="hidden" name="assetId" value={failure.asset_id} />
                        <button
                          type="submit"
                          style={{
                            borderRadius: 999,
                            border: '1px solid rgba(255,255,255,0.16)',
                            background: 'rgba(255,255,255,0.06)',
                            color: 'inherit',
                            padding: '10px 14px',
                            cursor: 'pointer'
                          }}
                        >
                          Retry generation
                        </button>
                      </form>
                    ) : (
                      <p className="muted" style={{ margin: 0 }}>
                        Video generation is disabled until a real video backend is configured.
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ))}
    </main>
  );
}
