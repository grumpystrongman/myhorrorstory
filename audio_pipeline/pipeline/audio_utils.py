from __future__ import annotations

from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
from pydub import AudioSegment
from scipy import signal


def ensure_stereo(audio: np.ndarray) -> np.ndarray:
    if audio.ndim == 1:
        return np.stack([audio, audio], axis=0)
    if audio.ndim == 2 and audio.shape[0] in (1, 2):
        if audio.shape[0] == 1:
            return np.concatenate([audio, audio], axis=0)
        return audio
    if audio.ndim == 2 and audio.shape[1] in (1, 2):
        swapped = audio.T
        return ensure_stereo(swapped)
    raise ValueError(f"Unsupported audio shape: {audio.shape}")


def write_wav(path: str | Path, audio: np.ndarray, sample_rate: int) -> Path:
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    stereo = ensure_stereo(audio).T.astype(np.float32)
    sf.write(output, stereo, samplerate=sample_rate, subtype="PCM_24")
    return output


def read_wav(path: str | Path, target_sample_rate: int | None = None) -> tuple[np.ndarray, int]:
    data, sample_rate = sf.read(str(path), always_2d=True)
    audio = data.T.astype(np.float32)
    audio = ensure_stereo(audio)
    if target_sample_rate and sample_rate != target_sample_rate:
        resampled_channels = [
            librosa.resample(channel, orig_sr=sample_rate, target_sr=target_sample_rate)
            for channel in audio
        ]
        audio = np.stack(resampled_channels, axis=0)
        sample_rate = target_sample_rate
    return audio, sample_rate


def peak_normalize(audio: np.ndarray, target_dbfs: float = -1.0) -> np.ndarray:
    stereo = ensure_stereo(audio)
    peak = np.max(np.abs(stereo))
    if peak <= 1e-9:
        return stereo
    target_linear = 10 ** (target_dbfs / 20.0)
    return (stereo / peak) * target_linear


def rms_match(audio: np.ndarray, target_dbfs: float = -18.0) -> np.ndarray:
    stereo = ensure_stereo(audio)
    rms = np.sqrt(np.mean(np.square(stereo)))
    if rms <= 1e-9:
        return stereo
    target_linear = 10 ** (target_dbfs / 20.0)
    gain = target_linear / rms
    return stereo * gain


def apply_fades(
    audio: np.ndarray,
    sample_rate: int,
    fade_in_ms: int = 0,
    fade_out_ms: int = 0,
) -> np.ndarray:
    stereo = ensure_stereo(audio).copy()
    total_samples = stereo.shape[1]

    if fade_in_ms > 0:
        fade_samples = min(int(sample_rate * (fade_in_ms / 1000.0)), total_samples)
        if fade_samples > 1:
            env = np.linspace(0.0, 1.0, fade_samples)
            stereo[:, :fade_samples] *= env

    if fade_out_ms > 0:
        fade_samples = min(int(sample_rate * (fade_out_ms / 1000.0)), total_samples)
        if fade_samples > 1:
            env = np.linspace(1.0, 0.0, fade_samples)
            stereo[:, -fade_samples:] *= env

    return stereo


def apply_highpass(audio: np.ndarray, sample_rate: int, cutoff_hz: float | None) -> np.ndarray:
    if not cutoff_hz or cutoff_hz <= 0:
        return ensure_stereo(audio)
    b, a = signal.butter(2, cutoff_hz / (sample_rate * 0.5), btype="highpass")
    return signal.filtfilt(b, a, ensure_stereo(audio), axis=1).astype(np.float32)


def apply_lowpass(audio: np.ndarray, sample_rate: int, cutoff_hz: float | None) -> np.ndarray:
    if not cutoff_hz or cutoff_hz <= 0:
        return ensure_stereo(audio)
    b, a = signal.butter(2, cutoff_hz / (sample_rate * 0.5), btype="lowpass")
    return signal.filtfilt(b, a, ensure_stereo(audio), axis=1).astype(np.float32)


def apply_distortion(audio: np.ndarray, drive: float = 0.0) -> np.ndarray:
    stereo = ensure_stereo(audio)
    if drive <= 0:
        return stereo
    scaled = stereo * (1.0 + drive * 8.0)
    return np.tanh(scaled).astype(np.float32)


def reverse_audio(audio: np.ndarray) -> np.ndarray:
    return ensure_stereo(audio)[:, ::-1].copy()


def time_stretch(audio: np.ndarray, rate: float, sample_rate: int) -> np.ndarray:
    stereo = ensure_stereo(audio)
    if rate <= 0:
        raise ValueError("Time-stretch rate must be > 0.")
    if np.isclose(rate, 1.0):
        return stereo
    stretched = [
        librosa.effects.time_stretch(channel, rate=rate).astype(np.float32)
        for channel in stereo
    ]
    max_len = max(len(ch) for ch in stretched)
    aligned = []
    for channel in stretched:
        if len(channel) < max_len:
            channel = np.pad(channel, (0, max_len - len(channel)))
        aligned.append(channel)
    return np.stack(aligned, axis=0)


def apply_eq_three_band(
    audio: np.ndarray,
    sample_rate: int,
    low_db: float = 0.0,
    mid_db: float = 0.0,
    high_db: float = 0.0,
) -> np.ndarray:
    stereo = ensure_stereo(audio)
    low = apply_lowpass(stereo, sample_rate, 180.0)
    high = apply_highpass(stereo, sample_rate, 2800.0)
    mid = stereo - low - high
    low_gain = 10 ** (low_db / 20.0)
    mid_gain = 10 ** (mid_db / 20.0)
    high_gain = 10 ** (high_db / 20.0)
    return (low * low_gain + mid * mid_gain + high * high_gain).astype(np.float32)


def to_audiosegment(audio: np.ndarray, sample_rate: int) -> AudioSegment:
    stereo = np.clip(ensure_stereo(audio), -1.0, 1.0)
    interleaved = (stereo.T * 32767.0).astype(np.int16).reshape(-1)
    return AudioSegment(
        data=interleaved.tobytes(),
        sample_width=2,
        frame_rate=sample_rate,
        channels=2,
    )


def from_audiosegment(segment: AudioSegment) -> tuple[np.ndarray, int]:
    sample_rate = segment.frame_rate
    samples = np.array(segment.get_array_of_samples()).astype(np.float32)
    if segment.channels == 2:
        stereo = samples.reshape((-1, 2)).T / 32767.0
    else:
        mono = samples / 32767.0
        stereo = np.stack([mono, mono], axis=0)
    return ensure_stereo(stereo), sample_rate


def gain_db(audio: np.ndarray, gain_db_value: float) -> np.ndarray:
    stereo = ensure_stereo(audio)
    gain_linear = 10 ** (gain_db_value / 20.0)
    return stereo * gain_linear

