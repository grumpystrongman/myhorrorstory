from __future__ import annotations

import argparse
from pathlib import Path


def parse_args() -> argparse.Namespace:
    script_root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(
        description="Layer and post-process horror stems into polished game-ready cues."
    )
    parser.add_argument(
        "--config",
        default=str(script_root / "config" / "pipeline.yaml"),
        help="Path to YAML or JSON pipeline config.",
    )
    parser.add_argument(
        "--cue-id",
        default=None,
        help="Optional cue id filter. If omitted, process all mix jobs.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    from pipeline.audio_utils import write_wav
    from pipeline.config_loader import load_pipeline_config
    from pipeline.mixing import mix_layers_from_spec

    config = load_pipeline_config(args.config)
    anchor = Path(__file__).resolve().parent
    global_cfg = config.get("global", {})
    mix_jobs = config.get("mix_jobs", [])
    if not mix_jobs:
        raise ValueError("No mix_jobs found in config.")

    sample_rate = int(global_cfg.get("sample_rate", 48000))
    fade_in_ms = int(global_cfg.get("fade_in_ms", 1200))
    fade_out_ms = int(global_cfg.get("fade_out_ms", 2200))
    loudness_target_dbfs = float(global_cfg.get("loudness_target_dbfs", -17.0))
    normalize_peak_dbfs = float(global_cfg.get("normalize_peak_dbfs", -1.0))
    base_dir = Path(config.get("project_root", "."))
    if not base_dir.is_absolute():
        base_dir = (anchor / base_dir).resolve()

    for job in mix_jobs:
        cue_id = job.get("cue_id", "unknown-cue")
        if args.cue_id and cue_id != args.cue_id:
            continue
        mixed = mix_layers_from_spec(
            mix_job=job,
            sample_rate=sample_rate,
            fade_in_ms=fade_in_ms,
            fade_out_ms=fade_out_ms,
            loudness_target_dbfs=loudness_target_dbfs,
            normalize_peak_dbfs=normalize_peak_dbfs,
            base_dir=base_dir,
        )
        output_file = Path(job["output_file"])
        output_path = base_dir / output_file
        write_wav(output_path, mixed, sample_rate)
        print(f"[mix] cue={cue_id} wrote {output_path}")


if __name__ == "__main__":
    main()
