# Horror Music System (Local Generation + Adaptive Playback)

This subsystem delivers two integrated parts:

1. **Static generation pipeline (local):** builds original horror tracks and stems with AudioCraft (`MusicGen` + optional `AudioGen`), then post-processes and exports loop/stinger assets.
2. **Adaptive in-game playback (runtime):** uses Mubert API to request state-driven music with smooth crossfades, debounce/rate-limit logic, and fallback behavior.

No copyrighted sample libraries are used by default. All outputs are generated/synthesized.

## 1) Requirements

- Python **3.11+**
- Optional GPU (recommended for AudioCraft performance)
- `ffmpeg` recommended for broader pydub compatibility (WAV-only flow works without advanced codecs)

## 2) Installation

From repo root:

```bash
cd audio_pipeline
python -m venv .venv
```

Activate venv:

- Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

- macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 3) API Keys (Mubert)

Copy and edit:

```bash
cp .env.example .env
```

Set your own:

- `MUBERT_CUSTOMER_ID`
- `MUBERT_ACCESS_TOKEN`

For web/runtime integration, load these via your secure backend/config system.  
Do **not** hardcode production secrets in front-end code.

## 4) Prompt Library

Prompt library file:

- `audio_pipeline/prompts/horror_prompt_library.json`

Included categories with variants:

- title screen dark ambient
- abandoned hospital ambience
- occult chamber drone
- enemy stalking tension
- industrial nightmare chase
- boss dread build
- scare hit / stinger
- post-death void ambience

Each category has multiple variants tuned for dread, dissonance, asymmetry, and pressure.

## 5) Config

Primary pipeline config:

- `audio_pipeline/config/pipeline.yaml`

Tune per your game:

- duration
- output paths
- sample rate (default 48k)
- stem type
- prompt text / prompt category
- generation count
- seed
- loudness target
- fade in/out
- loop padding / loop crossfade
- EQ/filter settings
- stinger density

## 6) CLI Scripts

### A) MusicGen stem generation

```bash
python generate_musicgen.py \
  --prompt "oppressive dark ambient drone, atonal low strings, sub rumble, no melody" \
  --duration 120 \
  --count 1 \
  --prefix title-screen \
  --output-dir generated \
  --allow-fallback
```

### B) AudioGen texture generation

```bash
python generate_audiogen_textures.py \
  --prompt "metallic scrapes, distant industrial rumble, unstable breathing textures" \
  --duration 90 \
  --count 1 \
  --prefix title-texture \
  --output-dir stems \
  --allow-fallback
```

### C) Mix/post-process from config

```bash
python mix_and_process.py --config config/pipeline.yaml
```

### D) Export loopables + stingers

```bash
python export_assets.py --config config/pipeline.yaml
```

### E) Full batch build

```bash
python batch_generate.py \
  --config config/pipeline.yaml \
  --prompts prompts/horror_prompt_library.json \
  --allow-fallback
```

Optional single cue:

```bash
python batch_generate.py --cue-id title_screen_main --allow-fallback
```

## 7) Output Locations

Generated stems:

- `stems/<cue_id>/...` (inside `audio_pipeline/`)

Mixed cues:

- `processed/*_mix.wav`

Loop/stinger exports:

- `processed/<cue_id>/loops/*.wav`
- `processed/<cue_id>/stingers/*.wav`

## 8) Adaptive Mubert Integration

Code:

- `game_integration/mubert/mubertClient.ts`
- `game_integration/mubert/adaptiveMusicManager.ts`
- `game_integration/mubert/simpleStateManager.ts`
- `game_integration/mubert/webExample.ts`
- `game_integration/mubert/unity/HorrorAdaptiveMusicController.cs`

Capabilities:

- game state mapping to intensity/theme
- smooth equal-power crossfades
- debounced state transitions
- minimum transition interval (anti-thrash)
- API fallback to local loops
- URL cache and neighbor preloading

## 9) Library/API Uncertainty Handling

Where API structure can differ per account plan/docs:

- response parsing is isolated in `mubertClient.ts`
- endpoint assumptions are explicitly commented
- no fake private endpoints are invented
- Unity sample uses robust URL extraction fallback and documented assumptions

Confirm final response schema and supported request fields against your Mubert account docs before release.

## 10) Horror Tuning Recommendations

To increase dread:

- reduce rhythmic regularity
- increase low-band instability (30-80 Hz movement)
- keep melodic content ambiguous/minimal
- widen dynamic contrast (quiet beds + hard stinger spikes)
- use sparse event density for tension

To avoid "generic spooky wallpaper":

- remove predictable 4/4 pulse unless in chase
- avoid major/minor tonal centers
- avoid heroic crescendos and trailer brass arcs

## 11) Heavy-Dependency Fallback Path

If AudioCraft setup fails locally (common on constrained hardware):

- run with `--allow-fallback`
- pipeline synthesizes original procedural dread textures as temporary production placeholders
- quality is lower than full model generation but preserves workflow and integration testing

## 12) Commercial/Licensing Reminder

Before shipping:

- verify **Mubert commercial licensing terms** for your exact use case (game distribution model, monetization, territories, sublicensing, streaming/download rights)
- keep proof of plan/terms version used at ship time
