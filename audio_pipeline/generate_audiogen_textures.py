from __future__ import annotations

import argparse
from pathlib import Path


def parse_args() -> argparse.Namespace:
    script_root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(
        description="Generate auxiliary horror texture stems using Meta AudioCraft AudioGen."
    )
    parser.add_argument(
        "--prompt",
        required=True,
        help=(
            "Texture prompt (examples: metallic scrapes, distant rumble, mechanical drones, "
            "breathing, ritual impacts)."
        ),
    )
    parser.add_argument("--duration", type=int, default=45, help="Duration in seconds.")
    parser.add_argument("--count", type=int, default=1, help="How many takes to generate.")
    parser.add_argument(
        "--output-dir",
        default=str(script_root / "stems"),
        help="Output directory.",
    )
    parser.add_argument("--sample-rate", type=int, default=48000, help="Target sample rate.")
    parser.add_argument("--model", default="facebook/audiogen-medium", help="AudioGen model.")
    parser.add_argument("--seed", type=int, default=None, help="Best-effort deterministic seed.")
    parser.add_argument(
        "--allow-fallback",
        action="store_true",
        help="Use local synthesized fallback if AudioCraft cannot initialize.",
    )
    parser.add_argument("--prefix", default="texture", help="Output filename prefix.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    from pipeline.audio_utils import peak_normalize, write_wav
    from pipeline.config_loader import ensure_directory, slugify
    from pipeline.generation import AudioCraftGenerator, GenerationRequest

    out_dir = ensure_directory(args.output_dir)
    generator = AudioCraftGenerator()

    for idx in range(args.count):
        request = GenerationRequest(
            prompt=args.prompt,
            duration=args.duration,
            sample_rate=args.sample_rate,
            model_name=args.model,
            seed=(args.seed + idx) if args.seed is not None else None,
            allow_fallback=args.allow_fallback,
        )
        audio, sample_rate = generator.generate_texture(request)
        audio = peak_normalize(audio, target_dbfs=-1.5)
        file_name = f"{slugify(args.prefix)}_{idx + 1:02d}.wav"
        path = Path(out_dir) / file_name
        write_wav(path, audio, sample_rate)
        print(f"[audiogen] wrote {path}")


if __name__ == "__main__":
    main()
