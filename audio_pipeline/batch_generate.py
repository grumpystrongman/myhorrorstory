from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    script_root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(
        description="Run full horror music pipeline: generation -> mix -> export."
    )
    parser.add_argument(
        "--config",
        default=str(script_root / "config" / "pipeline.yaml"),
        help="Path to YAML/JSON pipeline config.",
    )
    parser.add_argument(
        "--prompts",
        default=str(script_root / "prompts" / "horror_prompt_library.json"),
        help="Prompt library path (JSON/YAML).",
    )
    parser.add_argument("--cue-id", default=None, help="Optional cue id filter.")
    parser.add_argument("--skip-generation", action="store_true")
    parser.add_argument("--skip-mix", action="store_true")
    parser.add_argument("--skip-export", action="store_true")
    parser.add_argument(
        "--allow-fallback",
        action="store_true",
        help="Allow synthesized fallback if AudioCraft is unavailable.",
    )
    return parser.parse_args()


def resolve_prompt(prompt_library: dict[str, Any], job: dict[str, Any]) -> str:
    if "prompt" in job and job["prompt"]:
        return str(job["prompt"])

    category_name = job.get("prompt_category")
    if not category_name:
        raise ValueError(
            f"Generation job '{job.get('cue_id', 'unknown')}' has no prompt or prompt_category."
        )
    category = prompt_library["categories"].get(category_name)
    if not category:
        raise KeyError(f"Prompt category not found: {category_name}")
    variants = category.get("variants", [])
    if not variants:
        raise ValueError(f"Prompt category has no variants: {category_name}")
    idx = int(job.get("prompt_variant", 0))
    idx = max(0, min(idx, len(variants) - 1))
    return str(variants[idx])


def generate_from_jobs(
    config: dict[str, Any],
    prompt_library: dict[str, Any],
    cue_filter: str | None,
    allow_fallback: bool,
    base_dir: Path,
) -> None:
    from pipeline.audio_utils import peak_normalize, write_wav
    from pipeline.config_loader import ensure_directory
    from pipeline.generation import AudioCraftGenerator, GenerationRequest

    global_cfg = config.get("global", {})
    sample_rate = int(global_cfg.get("sample_rate", 48000))
    normalize_peak_dbfs = float(global_cfg.get("normalize_peak_dbfs", -1.0))
    model_defaults = global_cfg.get("model_defaults", {})
    generator = AudioCraftGenerator()

    jobs = config.get("generation_jobs", [])
    if not jobs:
        print("[batch] no generation_jobs found. Skipping generation.")
        return

    for job in jobs:
        cue_id = job["cue_id"]
        if cue_filter and cue_id != cue_filter:
            continue
        stem_type = job.get("stem_type", "stem")
        engine = job.get("engine", "musicgen").lower()
        duration = int(job.get("duration", 45))
        generation_count = int(job.get("generation_count", 1))
        seed = job.get("seed")
        prompt = resolve_prompt(prompt_library, job)

        stem_dir = ensure_directory(base_dir / "stems" / cue_id)
        print(f"[batch] generating cue={cue_id} stem={stem_type} engine={engine}")
        for take in range(generation_count):
            default_model = (
                model_defaults.get("musicgen", "facebook/musicgen-medium")
                if engine == "musicgen"
                else model_defaults.get("audiogen", "facebook/audiogen-medium")
            )
            request = GenerationRequest(
                prompt=prompt,
                duration=duration,
                sample_rate=sample_rate,
                model_name=str(job.get("model", default_model)),
                seed=(int(seed) + take) if seed is not None else None,
                top_k=int(job.get("top_k", 250)),
                temperature=float(job.get("temperature", 1.0)),
                cfg_coef=float(job.get("cfg_coef", 3.0)),
                allow_fallback=allow_fallback,
            )
            if engine == "musicgen":
                audio, sr = generator.generate_music(request)
            elif engine == "audiogen":
                audio, sr = generator.generate_texture(request)
            else:
                raise ValueError(f"Unsupported engine '{engine}' for cue {cue_id}.")

            normalized = peak_normalize(audio, target_dbfs=normalize_peak_dbfs)
            target_path = stem_dir / f"{stem_type}_{take + 1:03d}.wav"
            write_wav(target_path, normalized, sr)
            print(f"  - wrote {target_path}")


def run_mix_jobs(config: dict[str, Any], cue_filter: str | None) -> None:
    from pipeline.audio_utils import write_wav
    from pipeline.mixing import mix_layers_from_spec

    global_cfg = config.get("global", {})
    sample_rate = int(global_cfg.get("sample_rate", 48000))
    fade_in_ms = int(global_cfg.get("fade_in_ms", 1200))
    fade_out_ms = int(global_cfg.get("fade_out_ms", 2200))
    loudness_target_dbfs = float(global_cfg.get("loudness_target_dbfs", -17.0))
    normalize_peak_dbfs = float(global_cfg.get("normalize_peak_dbfs", -1.0))
    base_dir = Path(config.get("project_root", "."))
    if not base_dir.is_absolute():
        base_dir = (Path(__file__).resolve().parent / base_dir).resolve()
    mix_jobs = config.get("mix_jobs", [])
    if not mix_jobs:
        print("[batch] no mix_jobs found. Skipping mixing.")
        return
    for job in mix_jobs:
        cue_id = job.get("cue_id")
        if cue_filter and cue_id != cue_filter:
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
        output = base_dir / job["output_file"]
        write_wav(output, mixed, sample_rate)
        print(f"[batch] mixed cue={cue_id} -> {output}")


def run_export_jobs(config: dict[str, Any], cue_filter: str | None) -> None:
    from pipeline.exporters import export_loop_and_stingers

    global_cfg = config.get("global", {})
    sample_rate = int(global_cfg.get("sample_rate", 48000))
    loop_padding_ms = int(global_cfg.get("loop_padding_ms", 320))
    loop_crossfade_ms = int(global_cfg.get("loop_crossfade_ms", 120))
    stinger_density = float(global_cfg.get("stinger_density", 0.35))
    base_dir = Path(config.get("project_root", "."))
    if not base_dir.is_absolute():
        base_dir = (Path(__file__).resolve().parent / base_dir).resolve()
    export_jobs = config.get("export_jobs", [])
    if not export_jobs:
        print("[batch] no export_jobs found. Skipping export.")
        return
    for job in export_jobs:
        cue_id = job["cue_id"]
        if cue_filter and cue_id != cue_filter:
            continue
        result = export_loop_and_stingers(
            export_job=job,
            sample_rate=sample_rate,
            loop_padding_ms=loop_padding_ms,
            loop_crossfade_ms=loop_crossfade_ms,
            stinger_density=stinger_density,
            base_dir=base_dir,
        )
        print(f"[batch] exported cue={cue_id}")
        for group, paths in result.items():
            for p in paths:
                print(f"  - {group}: {p}")


def main() -> None:
    args = parse_args()

    from pipeline.config_loader import load_pipeline_config, load_prompt_library

    config = load_pipeline_config(args.config)
    prompt_library = load_prompt_library(args.prompts)
    base_dir = Path(config.get("project_root", "."))
    if not base_dir.is_absolute():
        base_dir = (Path(__file__).resolve().parent / base_dir).resolve()

    if not args.skip_generation:
        generate_from_jobs(
            config=config,
            prompt_library=prompt_library,
            cue_filter=args.cue_id,
            allow_fallback=args.allow_fallback,
            base_dir=base_dir,
        )
    if not args.skip_mix:
        run_mix_jobs(config=config, cue_filter=args.cue_id)
    if not args.skip_export:
        run_export_jobs(config=config, cue_filter=args.cue_id)


if __name__ == "__main__":
    main()
