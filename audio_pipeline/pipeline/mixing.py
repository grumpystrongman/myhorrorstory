from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from .audio_utils import (
    apply_distortion,
    apply_eq_three_band,
    apply_fades,
    apply_highpass,
    apply_lowpass,
    ensure_stereo,
    gain_db,
    peak_normalize,
    read_wav,
    reverse_audio,
    rms_match,
    time_stretch,
)


@dataclass
class LayerSpec:
    source: str
    gain_db: float = 0.0
    reverse: bool = False
    stretch: float = 1.0
    distortion: float = 0.0
    highpass_hz: float | None = None
    lowpass_hz: float | None = None
    eq_low_db: float = 0.0
    eq_mid_db: float = 0.0
    eq_high_db: float = 0.0


def _apply_layer_fx(audio: np.ndarray, sample_rate: int, layer: LayerSpec) -> np.ndarray:
    out = ensure_stereo(audio)
    if layer.reverse:
        out = reverse_audio(out)
    if not np.isclose(layer.stretch, 1.0):
        out = time_stretch(out, rate=layer.stretch, sample_rate=sample_rate)
    out = apply_highpass(out, sample_rate, layer.highpass_hz)
    out = apply_lowpass(out, sample_rate, layer.lowpass_hz)
    out = apply_eq_three_band(
        out,
        sample_rate,
        low_db=layer.eq_low_db,
        mid_db=layer.eq_mid_db,
        high_db=layer.eq_high_db,
    )
    out = apply_distortion(out, layer.distortion)
    out = gain_db(out, layer.gain_db)
    return out


def _align_length(tracks: list[np.ndarray]) -> list[np.ndarray]:
    max_len = max(track.shape[1] for track in tracks)
    aligned = []
    for track in tracks:
        if track.shape[1] < max_len:
            pad = np.zeros((track.shape[0], max_len - track.shape[1]), dtype=np.float32)
            track = np.concatenate([track, pad], axis=1)
        aligned.append(track)
    return aligned


def mix_layers_from_spec(
    mix_job: dict[str, Any],
    sample_rate: int,
    fade_in_ms: int,
    fade_out_ms: int,
    loudness_target_dbfs: float,
    normalize_peak_dbfs: float,
    base_dir: str | Path = ".",
) -> np.ndarray:
    layers_raw = mix_job.get("layers", [])
    if not layers_raw:
        raise ValueError(f"Mix job '{mix_job.get('cue_id', 'unknown')}' has no layers.")

    base = Path(base_dir)
    tracks: list[np.ndarray] = []
    for layer_raw in layers_raw:
        layer = LayerSpec(**layer_raw)
        source_path = (base / layer.source).resolve()
        if not source_path.exists():
            raise FileNotFoundError(f"Layer source does not exist: {source_path}")
        audio, layer_sr = read_wav(source_path, target_sample_rate=sample_rate)
        processed = _apply_layer_fx(audio, layer_sr, layer)
        tracks.append(processed.astype(np.float32))

    aligned = _align_length(tracks)
    mixed = np.sum(aligned, axis=0)
    mixed = rms_match(mixed, target_dbfs=loudness_target_dbfs)
    mixed = peak_normalize(mixed, target_dbfs=normalize_peak_dbfs)
    mixed = apply_fades(
        mixed,
        sample_rate=sample_rate,
        fade_in_ms=fade_in_ms,
        fade_out_ms=fade_out_ms,
    )
    return np.clip(mixed, -1.0, 1.0).astype(np.float32)

