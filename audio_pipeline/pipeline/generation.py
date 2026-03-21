from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Literal

import numpy as np
from scipy import signal

try:
    import torch
    from audiocraft.models import AudioGen, MusicGen

    AUDIOCRAFT_AVAILABLE = True
except ImportError:
    AUDIOCRAFT_AVAILABLE = False
    torch = None
    AudioGen = None
    MusicGen = None


EngineType = Literal["musicgen", "audiogen"]


@dataclass
class GenerationRequest:
    prompt: str
    duration: int
    sample_rate: int
    model_name: str
    seed: int | None = None
    top_k: int = 250
    temperature: float = 1.0
    cfg_coef: float = 3.0
    allow_fallback: bool = False


class AudioCraftGenerator:
    def __init__(self) -> None:
        self._music_models: dict[str, MusicGen] = {}
        self._audio_models: dict[str, AudioGen] = {}

    @staticmethod
    def available() -> bool:
        return AUDIOCRAFT_AVAILABLE

    def _seed(self, seed: int | None) -> None:
        if seed is None:
            return
        random.seed(seed)
        np.random.seed(seed)
        if torch is not None:
            torch.manual_seed(seed)
            if torch.cuda.is_available():
                torch.cuda.manual_seed_all(seed)

    def _get_music_model(self, model_name: str) -> MusicGen:
        model = self._music_models.get(model_name)
        if model is not None:
            return model
        if not AUDIOCRAFT_AVAILABLE or MusicGen is None:
            raise RuntimeError("AudioCraft MusicGen is not available.")
        model = MusicGen.get_pretrained(model_name)
        self._music_models[model_name] = model
        return model

    def _get_audio_model(self, model_name: str) -> AudioGen:
        model = self._audio_models.get(model_name)
        if model is not None:
            return model
        if not AUDIOCRAFT_AVAILABLE or AudioGen is None:
            raise RuntimeError("AudioCraft AudioGen is not available.")
        model = AudioGen.get_pretrained(model_name)
        self._audio_models[model_name] = model
        return model

    def generate_music(self, request: GenerationRequest) -> tuple[np.ndarray, int]:
        self._seed(request.seed)
        if AUDIOCRAFT_AVAILABLE:
            model = self._get_music_model(request.model_name)
            model.set_generation_params(
                duration=request.duration,
                top_k=request.top_k,
                temperature=request.temperature,
                cfg_coef=request.cfg_coef,
            )
            waveform = model.generate([request.prompt], progress=True)[0]
            audio = waveform.detach().cpu().float().numpy()
            return audio, int(model.sample_rate)

        if request.allow_fallback:
            return synthesize_fallback_music(
                prompt=request.prompt,
                duration=request.duration,
                sample_rate=request.sample_rate,
                seed=request.seed,
            ), request.sample_rate

        raise RuntimeError(
            "MusicGen unavailable. Install dependencies from requirements.txt or run with --allow-fallback."
        )

    def generate_texture(self, request: GenerationRequest) -> tuple[np.ndarray, int]:
        self._seed(request.seed)
        if AUDIOCRAFT_AVAILABLE:
            model = self._get_audio_model(request.model_name)
            model.set_generation_params(
                duration=request.duration,
                top_k=request.top_k,
                temperature=request.temperature,
                cfg_coef=request.cfg_coef,
            )
            waveform = model.generate([request.prompt], progress=True)[0]
            audio = waveform.detach().cpu().float().numpy()
            return audio, int(model.sample_rate)

        if request.allow_fallback:
            return synthesize_fallback_texture(
                prompt=request.prompt,
                duration=request.duration,
                sample_rate=request.sample_rate,
                seed=request.seed,
            ), request.sample_rate

        raise RuntimeError(
            "AudioGen unavailable. Install dependencies from requirements.txt or run with --allow-fallback."
        )


def _seed_rng(seed: int | None) -> np.random.Generator:
    return np.random.default_rng(seed)


def _pink_noise(size: int, rng: np.random.Generator) -> np.ndarray:
    white = rng.normal(0.0, 1.0, size=size)
    b = np.array([0.04992204, -0.09599354, 0.0506127, -0.004408786])
    a = np.array([1, -2.494956, 2.017265, -0.5221894])
    pink = signal.lfilter(b, a, white)
    peak = np.max(np.abs(pink)) + 1e-9
    return (pink / peak).astype(np.float32)


def synthesize_fallback_music(
    prompt: str,
    duration: int,
    sample_rate: int,
    seed: int | None = None,
) -> np.ndarray:
    """
    Lightweight fallback if MusicGen cannot run locally.
    Produces original synthesized dread beds without external samples.
    """

    rng = _seed_rng(seed)
    length = max(1, duration * sample_rate)
    t = np.linspace(0.0, duration, num=length, endpoint=False, dtype=np.float32)

    base_freqs = [34.0, 47.0, 59.0, 73.0]
    drone = np.zeros_like(t)
    for freq in base_freqs:
        phase = rng.uniform(0.0, 2.0 * np.pi)
        detune = rng.uniform(-0.45, 0.45)
        lfo = 0.08 * np.sin(2.0 * np.pi * rng.uniform(0.03, 0.09) * t + phase)
        drone += np.sin(2.0 * np.pi * (freq + detune) * t + phase + lfo)
    drone /= max(len(base_freqs), 1)

    noise = _pink_noise(length, rng) * 0.22
    low = signal.lfilter(*signal.butter(2, 120.0 / (sample_rate * 0.5), btype="low"), noise)
    high = signal.lfilter(*signal.butter(2, 2400.0 / (sample_rate * 0.5), btype="high"), noise) * 0.08

    pulse = np.zeros_like(t)
    pulse_period = rng.uniform(1.8, 3.4)
    for second in np.arange(0.0, duration, pulse_period):
        center = int(second * sample_rate)
        width = int(sample_rate * rng.uniform(0.08, 0.16))
        if width <= 0:
            continue
        start = max(0, center - width // 2)
        end = min(length, start + width)
        env = np.hanning(max(4, end - start))
        pulse[start:end] += env[: end - start] * rng.uniform(0.1, 0.35)

    text_hint = prompt.lower()
    metallic_boost = 0.12 if any(k in text_hint for k in ("metal", "industrial", "mechanical")) else 0.0
    ritual_boost = 0.15 if any(k in text_hint for k in ("ritual", "occult", "chant")) else 0.0

    combined = (0.55 * drone) + (0.35 * low) + high + pulse
    combined += metallic_boost * signal.lfilter(
        *signal.butter(1, [800.0 / (sample_rate * 0.5), 2200.0 / (sample_rate * 0.5)], btype="band"),
        _pink_noise(length, rng),
    )
    combined += ritual_boost * np.sin(2.0 * np.pi * 93.0 * t + rng.uniform(0.0, 2.0 * np.pi)) * 0.08

    left = combined + (_pink_noise(length, rng) * 0.012)
    right = np.roll(combined, int(sample_rate * 0.03)) + (_pink_noise(length, rng) * 0.012)
    stereo = np.stack([left, right], axis=0).astype(np.float32)
    peak = np.max(np.abs(stereo)) + 1e-9
    return np.clip(stereo / peak * 0.8, -1.0, 1.0)


def synthesize_fallback_texture(
    prompt: str,
    duration: int,
    sample_rate: int,
    seed: int | None = None,
) -> np.ndarray:
    rng = _seed_rng(seed)
    length = max(1, duration * sample_rate)
    t = np.linspace(0.0, duration, num=length, endpoint=False, dtype=np.float32)
    base = _pink_noise(length, rng)

    # Broken machinery texture with unstable flutter.
    lfo = 0.5 + 0.5 * np.sin(2.0 * np.pi * rng.uniform(0.08, 0.24) * t)
    scrape = signal.lfilter(
        *signal.butter(2, [300.0 / (sample_rate * 0.5), 3400.0 / (sample_rate * 0.5)], btype="band"),
        base,
    )
    scrape *= (0.35 + lfo * 0.6)

    rumble = signal.lfilter(
        *signal.butter(2, 80.0 / (sample_rate * 0.5), btype="low"),
        _pink_noise(length, rng),
    ) * 0.4

    breath = np.sin(2.0 * np.pi * rng.uniform(0.11, 0.19) * t + rng.uniform(0, 2 * np.pi))
    breath = np.maximum(0.0, breath) * 0.2

    texture = scrape + rumble + breath
    if "impact" in prompt.lower() or "hit" in prompt.lower():
        hit_sample = min(length - 1, int(rng.uniform(0.1, 0.3) * length))
        env_len = int(sample_rate * 0.5)
        env = np.exp(-np.linspace(0.0, 6.0, env_len))
        texture[hit_sample : hit_sample + env_len] += env[: max(0, length - hit_sample)] * 0.9

    left = texture
    right = np.roll(texture, int(sample_rate * 0.017))
    stereo = np.stack([left, right], axis=0).astype(np.float32)
    peak = np.max(np.abs(stereo)) + 1e-9
    return np.clip(stereo / peak * 0.85, -1.0, 1.0)

