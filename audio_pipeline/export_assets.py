from __future__ import annotations

import argparse
from pathlib import Path


def parse_args() -> argparse.Namespace:
    script_root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(
        description="Export seamless loops and one-shot stingers from processed cues."
    )
    parser.add_argument(
        "--config",
        default=str(script_root / "config" / "pipeline.yaml"),
        help="Path to YAML or JSON pipeline config.",
    )
    parser.add_argument(
        "--cue-id",
        default=None,
        help="Optional cue id filter. If omitted, exports all configured cues.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    from pipeline.config_loader import load_pipeline_config
    from pipeline.exporters import export_loop_and_stingers

    config = load_pipeline_config(args.config)
    anchor = Path(__file__).resolve().parent
    global_cfg = config.get("global", {})
    export_jobs = config.get("export_jobs", [])
    if not export_jobs:
        raise ValueError("No export_jobs found in config.")

    sample_rate = int(global_cfg.get("sample_rate", 48000))
    loop_padding_ms = int(global_cfg.get("loop_padding_ms", 320))
    loop_crossfade_ms = int(global_cfg.get("loop_crossfade_ms", 120))
    stinger_density = float(global_cfg.get("stinger_density", 0.35))
    base_dir = Path(config.get("project_root", "."))
    if not base_dir.is_absolute():
        base_dir = (anchor / base_dir).resolve()

    for export_job in export_jobs:
        cue_id = export_job["cue_id"]
        if args.cue_id and cue_id != args.cue_id:
            continue
        result = export_loop_and_stingers(
            export_job=export_job,
            sample_rate=sample_rate,
            loop_padding_ms=loop_padding_ms,
            loop_crossfade_ms=loop_crossfade_ms,
            stinger_density=stinger_density,
            base_dir=base_dir,
        )
        print(f"[export] cue={cue_id}")
        for group, files in result.items():
            for file_path in files:
                print(f"  - {group}: {file_path}")


if __name__ == "__main__":
    main()
