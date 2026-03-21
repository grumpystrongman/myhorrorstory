# Horror Music System Overview

This repository now includes a complete two-part horror music stack:

1. `audio_pipeline/` for local asset generation and mastering.
2. `game_integration/mubert/` for adaptive runtime music switching via Mubert API.

Primary operator guide:

- [audio_pipeline/README.md](../audio_pipeline/README.md)

Key implementation files:

- Local generation batch entrypoint: `audio_pipeline/batch_generate.py`
- Prompt library: `audio_pipeline/prompts/horror_prompt_library.json`
- Pipeline config: `audio_pipeline/config/pipeline.yaml`
- Web adaptive manager: `game_integration/mubert/adaptiveMusicManager.ts`
- Unity adaptive manager: `game_integration/mubert/unity/HorrorAdaptiveMusicController.cs`

Licensing reminder:

- Verify Mubert licensing for your exact commercial game deployment before launch.
