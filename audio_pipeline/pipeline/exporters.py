from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from .audio_utils import (
    apply_fades,
    ensure_stereo,
    peak_normalize,
    read_wav,
    write_wav,
)


def _blend_edges(audio: np.ndarray, blend_samples: int) -> np.ndarray:
    stereo = ensure_stereo(audio).copy()
    if blend_samples <= 0 or stereo.shape[1] <= blend_samples * 2:
        return stereo

    head = stereo[:, :blend_samples]
    tail = stereo[:, -blend_samples:]
    fade_out = np.linspace(1.0, 0.0, blend_samples, dtype=np.float32)
    fade_in = np.linspace(0.0, 1.0, blend_samples, dtype=np.float32)
    blended = (tail * fade_out) + (head * fade_in)
    stereo[:, :blend_samples] = blended
    stereo[:, -blend_samples:] = blended
    return stereo


def make_loopable(
    audio: np.ndarray,
    sample_rate: int,
    loop_padding_ms: int = 320,
    loop_crossfade_ms: int = 120,
) -> np.ndarray:
    stereo = ensure_stereo(audio)
    blend_samples = int(sample_rate * (loop_crossfade_ms / 1000.0))
    looped = _blend_edges(stereo, blend_samples=blend_samples)
    if loop_padding_ms > 0:
        pad_samples = int(sample_rate * (loop_padding_ms / 1000.0))
        padding = np.zeros((2, pad_samples), dtype=np.float32)
        looped = np.concatenate([looped, padding], axis=1)
    return peak_normalize(looped, target_dbfs=-1.0)


def extract_stinger(
    audio: np.ndarray,
    sample_rate: int,
    duration_ms: int,
    seed: int | None = None,
) -> np.ndarray:
    rng = np.random.default_rng(seed)
    stereo = ensure_stereo(audio)
    total = stereo.shape[1]
    stinger_samples = max(1, int(sample_rate * (duration_ms / 1000.0)))
    if stinger_samples >= total:
        return apply_fades(stereo, sample_rate, fade_in_ms=10, fade_out_ms=160)

    mono = np.mean(stereo, axis=0)
    window = int(sample_rate * 0.08)
    if window <= 0:
        window = 1
    energy = np.convolve(mono**2, np.ones(window), mode="same")
    candidates = np.argsort(energy)[-max(12, total // max(stinger_samples, 1)) :]
    center = int(rng.choice(candidates))
    start = max(0, center - stinger_samples // 4)
    end = min(total, start + stinger_samples)
    start = max(0, end - stinger_samples)
    chunk = stereo[:, start:end]
    chunk = apply_fades(chunk, sample_rate, fade_in_ms=5, fade_out_ms=210)
    return peak_normalize(chunk, target_dbfs=-0.8)


def export_loop_and_stingers(
    export_job: dict[str, Any],
    sample_rate: int,
    loop_padding_ms: int,
    loop_crossfade_ms: int,
    stinger_density: float,
    base_dir: str | Path = ".",
) -> dict[str, list[Path]]:
    cue_id = export_job["cue_id"]
    source = Path(base_dir) / export_job["source"]
    if not source.exists():
        raise FileNotFoundError(f"Export source not found for cue '{cue_id}': {source}")

    output_dir = Path(base_dir) / export_job["output_dir"]
    loops_dir = output_dir / "loops"
    stingers_dir = output_dir / "stingers"
    loops_dir.mkdir(parents=True, exist_ok=True)
    stingers_dir.mkdir(parents=True, exist_ok=True)

    audio, sr = read_wav(source, target_sample_rate=sample_rate)
    loop_audio = make_loopable(
        audio,
        sample_rate=sr,
        loop_padding_ms=loop_padding_ms,
        loop_crossfade_ms=loop_crossfade_ms,
    )
    loop_path = loops_dir / f"{cue_id}_loop.wav"
    write_wav(loop_path, loop_audio, sr)

    # Stinger count scales with track length and configured density.
    seconds = loop_audio.shape[1] / max(sr, 1)
    stinger_count = max(1, int(seconds * max(stinger_density, 0.05) * 0.35))
    stinger_duration_ms = int(export_job.get("stinger_duration_ms", 1100))
    stinger_paths: list[Path] = []
    for idx in range(stinger_count):
        stinger = extract_stinger(
            audio,
            sample_rate=sr,
            duration_ms=stinger_duration_ms,
            seed=export_job.get("seed", 1907) + idx,
        )
        stinger_path = stingers_dir / f"{cue_id}_stinger_{idx + 1:02d}.wav"
        write_wav(stinger_path, stinger, sr)
        stinger_paths.append(stinger_path)

    return {"loops": [loop_path], "stingers": stinger_paths}

