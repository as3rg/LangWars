"""
LangWars promo soundtrack — deterministic retro-techno score + SFX.

126 BPM, 28 bars = 53.333 s at 30 fps.
Outputs:
  public/audio/langwars-mix.wav   (mastered to -14 LUFS / -1 dBTP)
  out/stems/music.wav
  out/stems/sfx.wav
  out/stems/*.wav
  out/soundtrack.json

Run: python tools/make_soundtrack.py
"""
from __future__ import annotations

import json
import math
import os
import re
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 48_000
FPS = 30
DUR = 1600 / FPS
N = int(round(SR * DUR))
BPM = 126
BEAT = 60.0 / BPM
BAR = 4 * BEAT
BARS = 28

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "audio"
OUT = ROOT / "out"
STEMS = OUT / "stems"
PUBLIC.mkdir(parents=True, exist_ok=True)
STEMS.mkdir(parents=True, exist_ok=True)

rng = np.random.default_rng(20261112)
T = np.arange(N, dtype=np.float64) / SR


# --------------------------------------------------------------------------
# primitives
# --------------------------------------------------------------------------

def ns(duration: float) -> int:
    return max(1, int(round(duration * SR)))


def tt(duration: float) -> np.ndarray:
    return np.arange(ns(duration), dtype=np.float64) / SR


def midi(note: float) -> float:
    return 440.0 * (2.0 ** ((note - 69.0) / 12.0))


def norm(x: np.ndarray, peak: float = 1.0) -> np.ndarray:
    m = float(np.max(np.abs(x))) if len(x) else 0.0
    return x * (peak / m) if m > 1e-9 else x


def fade(x: np.ndarray, attack: float = 0.002, release: float = 0.008) -> np.ndarray:
    n = len(x)
    a = min(n, int(attack * SR))
    r = min(n, int(release * SR))
    if a:
        x[:a] *= np.linspace(0.0, 1.0, a)
    if r:
        x[-r:] *= np.linspace(1.0, 0.0, r)
    return x


def sine(freq: float, duration: float, phase: float = 0.0) -> np.ndarray:
    return np.sin(2 * np.pi * (freq * tt(duration) + phase))


def saw(freq: float, duration: float, phase: float = 0.0) -> np.ndarray:
    return 2.0 * ((freq * tt(duration) + phase) % 1.0) - 1.0


def square(freq: float, duration: float, phase: float = 0.0) -> np.ndarray:
    return np.sign(np.sin(2 * np.pi * (freq * tt(duration) + phase)))


def noise(duration: float) -> np.ndarray:
    return rng.standard_normal(ns(duration))


def fft_filter(
    x: np.ndarray,
    low: float | None = None,
    high: float | None = None,
    resonance: float = 0.0,
) -> np.ndarray:
    """Zero-phase 2nd-order-ish low/high/band filter with optional resonance."""
    n = len(x)
    nfft = 1 << (n - 1).bit_length()
    spec = np.fft.rfft(x, nfft)
    freqs = np.fft.rfftfreq(nfft, 1.0 / SR)
    h = np.ones_like(freqs)
    if low:
        h *= 1.0 / np.sqrt(1.0 + (freqs / low) ** 4)
    if high:
        h *= 1.0 / np.sqrt(1.0 + (high / np.maximum(freqs, 1e-6)) ** 4)
    if resonance and low:
        h *= 1.0 + resonance * np.exp(
            -0.5 * ((np.log2(np.maximum(freqs, 1e-6)) - np.log2(low)) / 0.28) ** 2
        )
    return np.fft.irfft(spec * h, nfft)[:n]


def env_perc(duration: float, decay: float, attack: float = 0.002) -> np.ndarray:
    t = tt(duration)
    return (1.0 - np.exp(-t / max(attack, 1e-5))) * np.exp(-t / max(decay, 1e-5))


def high_shelf(x: np.ndarray, amount: float = 0.22, pivot: float = 3000.0, cap: float = 1.55) -> np.ndarray:
    n = len(x)
    nfft = 1 << (n - 1).bit_length()
    freqs = np.fft.rfftfreq(nfft, 1.0 / SR)
    h = np.clip(1.0 + amount * (freqs / pivot) ** 1.2, 1.0, cap)
    return np.fft.irfft(np.fft.rfft(x, nfft) * h, nfft)[:n]


def env_sustain(duration: float, attack: float, release: float) -> np.ndarray:
    t = tt(duration)
    return np.clip(t / max(attack, 1e-5), 0, 1) * np.clip(
        (duration - t) / max(release, 1e-5), 0, 1
    )


def add(
    bus_l: np.ndarray,
    bus_r: np.ndarray,
    start: float,
    sig: np.ndarray | tuple[np.ndarray, np.ndarray],
    gain: float = 1.0,
    pan: float = 0.0,
) -> None:
    if isinstance(sig, tuple):
        left, right = sig
    else:
        theta = (pan + 1.0) * math.pi / 4.0
        left = sig * math.cos(theta)
        right = sig * math.sin(theta)

    i = int(round(start * SR))
    if i < 0:
        cut = -i
        left = left[cut:]
        right = right[cut:]
        i = 0
    if i >= N or len(left) == 0:
        return
    j = min(N, i + len(left))
    n = j - i
    bus_l[i:j] += left[:n] * gain
    bus_r[i:j] += right[:n] * gain


def place(
    bus_l: np.ndarray,
    bus_r: np.ndarray,
    at: float,
    sig: np.ndarray | tuple[np.ndarray, np.ndarray],
    gain: float = 0.45,
    pan: float = 0.0,
) -> None:
    """Place a sound so its transient peak lands exactly on `at`."""
    if isinstance(sig, tuple):
        mono = np.abs(sig[0]) + np.abs(sig[1])
    else:
        mono = np.abs(sig)
    peak = float(np.argmax(mono)) / SR
    add(bus_l, bus_r, at - peak, sig, gain, pan)


# --------------------------------------------------------------------------
# instruments
# --------------------------------------------------------------------------

_cache: dict[tuple, np.ndarray] = {}


def make_kick(pitch: float = 1.0) -> np.ndarray:
    key = ("kick", round(pitch, 4))
    if key not in _cache:
        d = 0.55
        t = tt(d)
        f = (45.0 + 105.0 * np.exp(-t * 34.0)) * pitch
        phase = 2 * np.pi * np.cumsum(f) / SR
        body = np.sin(phase) * np.exp(-t / 0.22)
        click = fft_filter(noise(d), high=1400) * np.exp(-t / 0.006) * 0.6
        _cache[key] = norm(np.tanh((body + click) * 1.7))
    return _cache[key]


def make_clap() -> np.ndarray:
    key = ("clap",)
    if key not in _cache:
        d = 0.4
        t = tt(d)
        n = fft_filter(noise(d), low=5200, high=900)
        env = 0.45 * np.exp(-t / 0.13)
        for off in (0.0, 0.012, 0.024):
            env += 0.55 * np.exp(-((t - off) / 0.0075) ** 2)
        _cache[key] = norm(n * env)
    return _cache[key]


def make_snare() -> np.ndarray:
    key = ("snare",)
    if key not in _cache:
        d = 0.28
        t = tt(d)
        n = fft_filter(noise(d), low=6500, high=1300) * env_perc(d, 0.12)
        tone = np.sin(2 * np.pi * 175 * t) * env_perc(d, 0.09) * 0.35
        _cache[key] = norm(n + tone)
    return _cache[key]


def make_hat(open_hat: bool = False) -> np.ndarray:
    key = ("hat", open_hat)
    if key not in _cache:
        d = 0.24 if open_hat else 0.07
        decay = 0.14 if open_hat else 0.024
        n = fft_filter(noise(d), high=6500)
        _cache[key] = norm(n * env_perc(d, decay, 0.0015))
    return _cache[key]


def make_crash() -> np.ndarray:
    key = ("crash",)
    if key not in _cache:
        d = 2.4
        t = tt(d)
        n = fft_filter(noise(d), high=3500)
        shimmer = (
            np.sin(2 * np.pi * 6200 * t)
            + np.sin(2 * np.pi * 7800 * t) * 0.6
            + np.sin(2 * np.pi * 9400 * t) * 0.35
        ) * 0.12
        _cache[key] = norm((n + shimmer) * env_perc(d, 0.65, 0.002))
    return _cache[key]


def make_bass(note: float) -> np.ndarray:
    key = ("bass", note)
    if key not in _cache:
        d = 0.24
        f = midi(note)
        s = saw(f, d) * 0.65 + sine(f / 2, d) * 0.30 + sine(f, d) * 0.45
        s = fft_filter(s, low=380, high=32, resonance=1.0)
        s = np.tanh(s * 1.5) * env_perc(d, 0.12, 0.003)
        _cache[key] = norm(s)
    return _cache[key]


def make_pad(chord_index: int) -> tuple[np.ndarray, np.ndarray]:
    key = ("pad", chord_index)
    if key not in _cache:
        notes = CHORDS[chord_index][1]
        d = 2 * BAR + 0.45
        l = np.zeros(ns(d))
        r = np.zeros(ns(d))
        for ni, note in enumerate(notes):
            for det in (-7.0, 0.0, 7.0):
                f = midi(note) * (2.0 ** (det / 1200.0))
                s = fft_filter(saw(f, d, phase=rng.random()), low=1150, high=70, resonance=0.35)
                s *= env_sustain(d, 0.20, 0.55)
                theta = (0.45 * (-1.0 if ni % 2 else 1.0) + 1.0) * math.pi / 4.0
                l += s * math.cos(theta) * 0.06
                r += s * math.sin(theta) * 0.06
        _cache[key] = (norm(l), norm(r))
    return _cache[key]


def make_arp(note: float) -> np.ndarray:
    key = ("arp", note)
    if key not in _cache:
        d = 0.14
        f = midi(note)
        s = square(f, d) * 0.5 + saw(f, d) * 0.5
        s = fft_filter(s, low=4200, high=220, resonance=1.3)
        s *= env_perc(d, 0.065, 0.002)
        _cache[key] = norm(s)
    return _cache[key]


def make_lead(note: float) -> np.ndarray:
    key = ("lead", note)
    if key not in _cache:
        d = 0.36
        f = midi(note)
        t = tt(d)
        vib = 1.0 + 0.0035 * np.sin(2 * np.pi * 5.4 * t)
        phase = 2 * np.pi * np.cumsum(f * vib) / SR
        s = np.sign(np.sin(phase)) * 0.45 + np.sin(phase) * 0.22
        s = fft_filter(s, low=2600, high=320, resonance=1.0)
        s *= env_perc(d, 0.19, 0.006)
        _cache[key] = norm(s)
    return _cache[key]


# --------------------------------------------------------------------------
# SFX
# --------------------------------------------------------------------------

def sfx_impact() -> np.ndarray:
    key = ("impact",)
    if key not in _cache:
        d = 1.3
        t = tt(d)
        f = 92.0 * np.exp(-t * 9.0) + 27.0
        sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.45)
        n = fft_filter(noise(d), low=2400, high=25) * np.exp(-t / 0.24)
        rev = fft_filter(noise(d), low=5000, high=500) * np.exp(-((d - t) / 0.45) ** 2)
        _cache[key] = norm(np.tanh((sub * 1.5 + n * 0.8 + rev * 0.35) * 1.5))
    return _cache[key]


def sfx_subhit() -> np.ndarray:
    key = ("subhit",)
    if key not in _cache:
        d = 0.9
        t = tt(d)
        f = 70.0 * np.exp(-t * 5.0) + 30.0
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.35)
        _cache[key] = norm(np.tanh(s * 1.8))
    return _cache[key]


def sfx_riser(d: float = 2.0) -> np.ndarray:
    key = ("riser", round(d, 3))
    if key not in _cache:
        t = tt(d)
        f = 110.0 * (2.0 ** (t / d * 3.4))
        phase = 2 * np.pi * np.cumsum(f) / SR
        tone = np.sin(phase) * 0.35 + np.sign(np.sin(phase * 2)) * 0.08
        n = fft_filter(noise(d), high=1300) * 0.7
        env = (t / d) ** 2.8
        _cache[key] = norm((tone + n) * env)
    return _cache[key]


def sfx_whoosh(d: float = 0.7) -> np.ndarray:
    key = ("whoosh", round(d, 3))
    if key not in _cache:
        t = tt(d)
        n = fft_filter(noise(d), low=5200, high=280)
        n *= 0.62 + 0.38 * np.sin(np.pi * np.clip(t / d, 0, 1))
        env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2.4
        _cache[key] = norm(n * env)
    return _cache[key]


def sfx_glitch(seed: int = 1) -> np.ndarray:
    key = ("glitch", seed)
    if key not in _cache:
        d = 0.24
        t = tt(d)
        n = fft_filter(noise(d), low=7000, high=500)
        hold = np.repeat(n[::4], 4)[: len(n)]
        crushed = np.round(hold * 5) / 5
        f = 180 + 900 * np.exp(-t * 9) + 40 * np.sin(2 * np.pi * 17 * t)
        tone = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.22
        gate = (np.sin(2 * np.pi * (12 + seed) * t) > -0.2).astype(float)
        _cache[key] = norm((crushed * 0.65 + tone) * gate * env_perc(d, 0.13, 0.001))
    return _cache[key]


def sfx_zap(freq: float = 440.0) -> np.ndarray:
    key = ("zap", round(freq, 1))
    if key not in _cache:
        d = 0.18
        t = tt(d)
        f = freq * (1.0 + 1.5 * np.exp(-t * 28))
        phase = 2 * np.pi * np.cumsum(f) / SR
        s = np.sign(np.sin(phase)) * 0.5 + np.sin(phase) * 0.3
        s = fft_filter(s, low=6500, high=250)
        _cache[key] = norm(np.tanh(s * 1.6) * env_perc(d, 0.075, 0.001))
    return _cache[key]


def sfx_blip(freq: float = 880.0) -> np.ndarray:
    key = ("blip", round(freq, 1))
    if key not in _cache:
        d = 0.10
        t = tt(d)
        f = freq * (1.0 + 0.55 * np.exp(-t * 35))
        s = np.sin(2 * np.pi * np.cumsum(f) / SR)
        _cache[key] = norm(s * env_perc(d, 0.045, 0.0015))
    return _cache[key]


def sfx_pop() -> np.ndarray:
    key = ("pop",)
    if key not in _cache:
        d = 0.14
        t = tt(d)
        f = 240.0 * (1.0 + 1.8 * np.exp(-t * 28))
        s = np.sin(2 * np.pi * np.cumsum(f) / SR)
        _cache[key] = norm(s * env_perc(d, 0.035, 0.001))
    return _cache[key]


def sfx_tick() -> np.ndarray:
    key = ("tick",)
    if key not in _cache:
        d = 0.035
        t = tt(d)
        n = fft_filter(noise(d), high=5500) * np.exp(-t / 0.003)
        tone = np.sin(2 * np.pi * 3400 * t) * np.exp(-t / 0.004) * 0.4
        _cache[key] = norm(n + tone)
    return _cache[key]


def sfx_key() -> np.ndarray:
    key = ("key",)
    if key not in _cache:
        d = 0.07
        t = tt(d)
        n = fft_filter(noise(d), high=1800, low=500) * env_perc(d, 0.012, 0.001)
        tone = np.sin(2 * np.pi * 880 * t) * env_perc(d, 0.012) * 0.35
        _cache[key] = norm(n + tone)
    return _cache[key]


def sfx_toggle() -> np.ndarray:
    key = ("toggle",)
    if key not in _cache:
        out = np.zeros(ns(0.12))
        for i, f in enumerate((1500.0, 2200.0)):
            bt = tt(0.045)
            env = np.clip(bt / 0.001, 0, 1) * np.exp(-bt / 0.012)
            s = np.sin(2 * np.pi * f * bt) * env * 0.6
            i0 = ns(i * 0.045)
            out[i0:i0 + len(s)] += s[: len(out) - i0]
        _cache[key] = norm(out)
    return _cache[key]


def sfx_chime(freq: float = 880.0) -> np.ndarray:
    key = ("chime", round(freq, 1))
    if key not in _cache:
        d = 0.7
        t = tt(d)
        s = np.zeros_like(t)
        for ratio, amp, decay in ((1, 1.0, 0.30), (2, 0.5, 0.22), (3, 0.24, 0.17), (4.2, 0.12, 0.12)):
            s += np.sin(2 * np.pi * freq * ratio * t) * amp * np.exp(-t / decay)
        _cache[key] = norm(s * env_perc(d, 0.6, 0.002))
    return _cache[key]


def sfx_coin() -> np.ndarray:
    key = ("coin",)
    if key not in _cache:
        a = sfx_chime(880)
        b = sfx_chime(1320)
        out = np.zeros(ns(0.9))
        out[: len(a)] += a * 0.75
        out[ns(0.07): ns(0.07) + len(b)] += b[: len(out) - ns(0.07)] * 0.85
        _cache[key] = norm(out)
    return _cache[key]


def sfx_alarm() -> np.ndarray:
    key = ("alarm",)
    if key not in _cache:
        d = 0.42
        out = np.zeros(ns(d))
        for i, f in enumerate((520.0, 390.0, 520.0)):
            beep_t = tt(0.09)
            env = np.clip(beep_t / 0.005, 0, 1) * np.clip((0.09 - beep_t) / 0.02, 0, 1)
            s = np.sign(np.sin(2 * np.pi * f * beep_t)) * env * 0.4
            i0 = ns(i * 0.12)
            out[i0:i0 + len(s)] += s[: len(out) - i0]
        _cache[key] = norm(out)
    return _cache[key]


def sfx_recheck() -> np.ndarray:
    key = ("recheck",)
    if key not in _cache:
        out = np.zeros(ns(0.55))
        for i, f in enumerate((660.0, 880.0, 1100.0)):
            s = sfx_blip(f)
            i0 = ns(i * 0.11)
            out[i0:i0 + len(s)] += s[: len(out) - i0] * 0.8
        _cache[key] = norm(out)
    return _cache[key]


def sfx_data() -> np.ndarray:
    key = ("data",)
    if key not in _cache:
        out = np.zeros(ns(0.5))
        notes = (1320, 1760, 2200, 1760, 2640, 2200)
        for i, f in enumerate(notes):
            s = sfx_blip(f)
            i0 = ns(i * 0.07)
            out[i0:i0 + len(s)] += s[: len(out) - i0] * 0.55
        _cache[key] = norm(out)
    return _cache[key]


def sfx_powerup() -> np.ndarray:
    key = ("powerup",)
    if key not in _cache:
        d = 0.9
        t = tt(d)
        f = 90.0 * (2.0 ** (t / d * 4.0))
        phase = 2 * np.pi * np.cumsum(f) / SR
        tone = np.sin(phase) * 0.5
        n = fft_filter(noise(d), high=1500) * 0.4
        _cache[key] = norm((tone + n) * np.clip(t / d, 0, 1) ** 1.6)
    return _cache[key]


def sfx_powerdown() -> np.ndarray:
    key = ("powerdown",)
    if key not in _cache:
        d = 1.6
        t = tt(d)
        f = 220.0 * np.exp(-t * 2.2) + 30.0
        phase = 2 * np.pi * np.cumsum(f) / SR
        s = np.sin(phase) * 0.55 + fft_filter(noise(d), low=1200) * 0.25
        _cache[key] = norm(s * np.exp(-t / 0.55))
    return _cache[key]


def sfx_sparkle() -> np.ndarray:
    key = ("sparkle",)
    if key not in _cache:
        out = np.zeros(ns(0.8))
        for i, f in enumerate((1760, 2200, 2640, 3520, 4400)):
            s = sfx_chime(f) * 0.45
            i0 = ns(i * 0.045)
            out[i0:i0 + len(s)] += s[: len(out) - i0]
        _cache[key] = norm(out)
    return _cache[key]


def sfx_shimmer() -> np.ndarray:
    key = ("shimmer",)
    if key not in _cache:
        d = 1.4
        t = tt(d)
        s = np.zeros_like(t)
        for f in (880, 1108.7, 1318.5, 1760, 2217.5):
            s += np.sin(2 * np.pi * f * t + rng.random() * 6.28) * 0.25
        s *= np.sin(np.pi * t / d) ** 1.5
        _cache[key] = norm(s * 0.7)
    return _cache[key]


# --------------------------------------------------------------------------
# score
# --------------------------------------------------------------------------

CHORDS = [
    ("Am", [57, 60, 64], 33, [69, 72, 76, 79]),
    ("F", [53, 57, 60], 29, [65, 69, 72, 77]),
    ("C", [48, 52, 55], 36, [60, 64, 67, 72]),
    ("G", [55, 59, 62], 31, [67, 71, 74, 79]),
]

GAINS = {
    "intro": dict(kick=0.85, clap=0.28, hat=0.34, bass=0.38, pad=0.52, arp=0.38, lead=0.0, perc=0.2),
    "drive": dict(kick=1.0, clap=0.52, hat=0.58, bass=0.75, pad=0.46, arp=0.66, lead=0.0, perc=0.3),
    "break": dict(kick=0.82, clap=0.40, hat=0.38, bass=0.50, pad=0.48, arp=0.30, lead=0.0, perc=0.18),
    "drop": dict(kick=0.95, clap=0.48, hat=0.42, bass=0.60, pad=0.62, arp=0.28, lead=0.0, perc=0.2),
    "rebuild": dict(kick=1.0, clap=0.58, hat=0.60, bass=0.80, pad=0.56, arp=0.58, lead=0.0, perc=0.3),
    "show": dict(kick=1.0, clap=0.58, hat=0.78, bass=0.84, pad=0.44, arp=0.78, lead=0.0, perc=0.34),
    "montage": dict(kick=1.0, clap=0.64, hat=0.90, bass=0.90, pad=0.50, arp=0.88, lead=0.0, perc=0.4),
    "outro": dict(kick=0.92, clap=0.48, hat=0.58, bass=0.74, pad=0.68, arp=0.74, lead=0.0, perc=0.3),
    "cta": dict(kick=1.0, clap=0.64, hat=0.82, bass=0.95, pad=0.62, arp=0.86, lead=0.44, perc=0.38),
}

KICK_PAT = {
    "intro": [1, 1, 1, 1],
    "drive": [1, 1, 1, 1],
    "break": [1, 0, 1, 0],
    "drop": [1, 0, 1, 0],
    "rebuild": [1, 1, 1, 1],
    "show": [1, 1, 1, 1],
    "montage": [1, 1, 1, 1],
    "outro": [1, 1, 1, 1],
    "cta": [1, 1, 1, 1],
}

ARP_PAT = {
    "intro": [0, 2, 1, 3],
    "drive": [0, 1, 2, 3, 2, 1, 3, 2],
    "break": [0, 2, 1, 3],
    "drop": [0, 1, 2, 3, 2, 1, 0, 1],
    "rebuild": [0, 1, 2, 3, 4, 3, 2, 1],
    "show": [0, 2, 1, 3, 2, 4, 3, 1],
    "montage": [0, 2, 1, 3, 4, 3, 2, 1],
    "outro": [0, 1, 2, 3, 2, 3, 4, 3],
    "cta": [0, 2, 1, 3, 2, 4, 3, 5],
}


def section(t: float) -> str:
    if t < 4.0:
        return "intro"
    if t < 11.0:
        return "drive"
    if t < 14.4:
        return "break"
    if t < 16.3:
        return "drop"
    if t < 19.2:
        return "rebuild"
    if t < 36.2:
        return "show"
    if t < 39.2:
        return "montage"
    if t < 42.2:
        return "outro"
    return "cta"


def chord_index(t: float) -> int:
    return (int(t / BAR) // 2) % 4


def make_music() -> tuple[np.ndarray, np.ndarray, np.ndarray, dict]:
    kick_l = np.zeros(N)
    kick_r = np.zeros(N)
    drum_l = np.zeros(N)
    drum_r = np.zeros(N)
    bass_l = np.zeros(N)
    bass_r = np.zeros(N)
    pad_l = np.zeros(N)
    pad_r = np.zeros(N)
    arp_l = np.zeros(N)
    arp_r = np.zeros(N)
    lead_l = np.zeros(N)
    lead_r = np.zeros(N)
    duck = np.ones(N)

    # drums ----------------------------------------------------------------
    beats = int(DUR / BEAT) + 1
    for i in range(beats):
        tb = i * BEAT
        if tb >= DUR:
            break
        sec = section(tb)
        g = GAINS[sec]
        if KICK_PAT[sec][i % 4]:
            add(kick_l, kick_r, tb, make_kick(), g["kick"])
            # sidechain dip for bass/pad/arp
            start = int(round(tb * SR))
            length = min(N - start, int(0.30 * SR))
            if length > 0:
                dip = 1.0 - 0.48 * np.exp(-np.arange(length) / (0.115 * SR))
                duck[start:start + length] *= dip

        # claps
        b = i % 4
        clap_on = (
            (sec in ("drive", "show", "montage", "cta", "outro") and b in (1, 3))
            or (sec == "intro" and b == 3)
            or (sec in ("break", "rebuild") and b in (1, 3))
            or (sec == "drop" and b == 1)
        )
        if clap_on:
            add(drum_l, drum_r, tb, make_clap(), g["clap"], 0.12)

        # snare ghost / fill accents
        if sec in ("drive", "show", "montage", "cta") and b == 3:
            add(drum_l, drum_r, tb + BEAT * 0.75, make_snare(), g["clap"] * 0.42, -0.15)

    # hats
    for i in range(int(DUR / (BEAT / 4)) + 1):
        ts = i * (BEAT / 4)
        if ts >= DUR:
            break
        sec = section(ts)
        g = GAINS[sec]
        is_16th = i % 4 != 0
        is_8th = i % 2 == 1
        if sec in ("show", "montage", "cta"):
            if i % 2 == 1:
                add(drum_l, drum_r, ts, make_hat(False), g["hat"], 0.18 if i % 4 == 1 else -0.18)
            elif i % 4 == 2:
                add(drum_l, drum_r, ts, make_hat(False), g["hat"] * 0.55, -0.18)
        else:
            if is_8th:
                add(drum_l, drum_r, ts, make_hat(False), g["hat"], 0.2 if i % 4 == 1 else -0.2)
        # open hat every half bar
        if i % 8 == 7:
            add(drum_l, drum_r, ts, make_hat(True), g["hat"] * 0.75, -0.15)

    # snare rolls into cuts
    for end in (4.0, 11.0, 19.2, 42.2, 51.8):
        for k in range(8):
            t = end - 0.5 + 0.5 * (k / 8.0) ** 1.7
            add(drum_l, drum_r, t, make_snare(), 0.24 + k * 0.018, -0.2 + k * 0.05)

    # crashes
    for at in (4.0, 11.0, 19.2, 42.2, 51.8):
        add(drum_l, drum_r, at, make_crash(), 0.34, 0.25)
        add(drum_l, drum_r, at, make_crash(), 0.26, -0.25)

    # bass ----------------------------------------------------------------
    for i in range(int(DUR / (BEAT / 2)) + 1):
        ts = i * (BEAT / 2)
        if ts >= DUR:
            break
        sec = section(ts)
        g = GAINS[sec]
        chord = CHORDS[chord_index(ts)]
        root = chord[2]
        if i % 2 == 1 or (sec in ("show", "montage", "cta") and i % 4 == 2):
            note = root + (12 if (sec in ("show", "cta") and i % 8 == 7) else 0)
            add(bass_l, bass_r, ts, make_bass(note), g["bass"], 0.0)
    # pad -----------------------------------------------------------------
    for block in range(BARS // 2):
        ts = block * 2 * BAR
        sec = section(ts)
        g = GAINS[sec]
        pl, pr = make_pad(block % 4)
        add(pad_l, pad_r, ts - 0.03, (pl, pr), g["pad"] * 0.82)

    # arp -----------------------------------------------------------------
    for i in range(int(DUR / (BEAT / 4)) + 1):
        ts = i * (BEAT / 4)
        if ts >= DUR:
            break
        sec = section(ts)
        g = GAINS[sec]
        if sec in ("intro", "break") and i % 2 == 1:
            continue
        chord = CHORDS[chord_index(ts)]
        pattern = ARP_PAT[sec]
        idx = pattern[i % len(pattern)]
        arp_notes = chord[3]
        octave = 12 if idx >= len(arp_notes) else 0
        note = arp_notes[idx % len(arp_notes)] + octave
        add(arp_l, arp_r, ts, make_arp(note), g["arp"], 0.16 if i % 2 else -0.16)

    # feedback delay on the arp bus
    delay = int(round(BEAT * 0.75 * SR))
    if delay < N:
        arp_dl = np.zeros(N)
        arp_dr = np.zeros(N)
        arp_dl[delay:] = arp_r[:-delay] * 0.30
        arp_dr[delay:] = arp_l[:-delay] * 0.30
        arp_l += arp_dl
        arp_r += arp_dr

    # lead ----------------------------------------------------------------
    lead_start = 46.60
    melody = [69, 72, 76, 74, 72, 69, 67, 69,
              69, 72, 76, 79, 76, 74, 72, 69]
    for i, note in enumerate(melody):
        ts = lead_start + i * (BEAT / 2)
        if ts >= 51.9:
            break
        add(lead_l, lead_r, ts, make_lead(note), GAINS[section(ts)]["lead"], 0.12 if i % 2 else -0.12)

    # sidechain ducking
    bass_l *= duck
    bass_r *= duck
    pad_l *= duck
    pad_r *= duck
    arp_l *= duck
    arp_r *= duck
    lead_l *= duck
    lead_r *= duck

    # music reverb send
    send_l = pad_l * 0.55 + arp_l * 0.28 + drum_l * 0.25
    send_r = pad_r * 0.55 + arp_r * 0.28 + drum_r * 0.25
    ir_d = 1.3
    ir_t = tt(ir_d)
    ir_l = fft_filter(noise(ir_d), low=5200, high=180) * np.exp(-ir_t / 0.38)
    ir_r = fft_filter(noise(ir_d), low=5200, high=180) * np.exp(-ir_t / 0.38)
    ir_l[: int(0.02 * SR)] = 0
    ir_r[: int(0.02 * SR)] = 0
    ir_l = norm(ir_l)
    ir_r = norm(ir_r)

    def convolve(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
        nfft = 1 << (len(x) + len(ir) - 2).bit_length()
        y = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)
        return y[: len(x)]

    rev_l = convolve(send_l, ir_l) * 0.22
    rev_r = convolve(send_r, ir_r) * 0.22

    music_l = kick_l + drum_l + bass_l + pad_l + arp_l + lead_l + rev_l
    music_r = kick_r + drum_r + bass_r + pad_r + arp_r + lead_r + rev_r

    stems = {
        "kick": (kick_l, kick_r),
        "drums": (drum_l + kick_l, drum_r + kick_r),
        "bass": (bass_l, bass_r),
        "pad": (pad_l, pad_r),
        "arp": (arp_l, arp_r),
        "lead": (lead_l, lead_r),
    }
    return music_l, music_r, np.stack([send_l, send_r]), stems


# --------------------------------------------------------------------------
# SFX cues
# --------------------------------------------------------------------------

def make_sfx_bus() -> tuple[np.ndarray, np.ndarray, list[dict]]:
    l = np.zeros(N)
    r = np.zeros(N)
    cues: list[dict] = []

    def cue(at: float, name: str, gain: float = 0.45, pan: float = 0.0, **kwargs) -> None:
        if name == "impact":
            sig = sfx_impact()
        elif name == "subhit":
            sig = sfx_subhit()
        elif name == "riser":
            sig = sfx_riser(kwargs.get("dur", 2.0))
        elif name == "whoosh":
            sig = sfx_whoosh(kwargs.get("dur", 0.7))
        elif name == "glitch":
            sig = sfx_glitch(kwargs.get("seed", 1))
        elif name == "zap":
            sig = sfx_zap(kwargs.get("freq", 440.0))
        elif name == "blip":
            sig = sfx_blip(kwargs.get("freq", 880.0))
        elif name == "pop":
            sig = sfx_pop()
        elif name == "tick":
            sig = sfx_tick()
        elif name == "key":
            sig = sfx_key()
        elif name == "toggle":
            sig = sfx_toggle()
        elif name == "chime":
            sig = sfx_chime(kwargs.get("freq", 880.0))
        elif name == "coin":
            sig = sfx_coin()
        elif name == "alarm":
            sig = sfx_alarm()
        elif name == "recheck":
            sig = sfx_recheck()
        elif name == "data":
            sig = sfx_data()
        elif name == "powerup":
            sig = sfx_powerup()
        elif name == "powerdown":
            sig = sfx_powerdown()
        elif name == "sparkle":
            sig = sfx_sparkle()
        elif name == "shimmer":
            sig = sfx_shimmer()
        elif name == "counter":
            sig = sfx_tick()
        else:
            raise ValueError(f"unknown sfx {name}")

        place(l, r, at, sig, gain, pan)
        cues.append({"at": round(at, 4), "kind": name, "gain": gain, "pan": round(pan, 3)})

    # logo / intro
    cue(0.000, "impact", 0.95)
    cue(0.000, "powerup", 0.42, -0.15)
    cue(0.900, "whoosh", 0.30, 0.25)
    cue(1.133, "pop", 0.34, 0.25)
    for i in range(5):
        cue(1.933 + i * 0.11, "tick", 0.14, -0.25 + i * 0.1)
    cue(2.700, "sparkle", 0.22, 0.3)

    # manifesto
    cue(3.810, "whoosh", 0.36, -0.1)
    cue(4.000, "impact", 0.62)
    cue(5.733, "glitch", 0.34, -0.22, seed=2)
    cue(7.467, "impact", 0.48, 0.2)
    cue(7.467, "glitch", 0.26, -0.2, seed=3)
    cue(9.333, "chime", 0.38, 0.0, freq=880)

    # break
    cue(11.000, "riser", 0.42, 0.0, dur=1.2)
    cue(11.000, "impact", 0.66)
    for i in range(11):
        cue(11.33 + i * 0.055, "key", 0.13, -0.3 + (i % 3) * 0.3)
    cue(12.133, "coin", 0.34, 0.1)
    cue(12.467, "whoosh", 0.26, -0.2, dur=0.55)
    cue(13.467, "data", 0.28, 0.2)
    cue(14.000, "impact", 0.78)
    cue(14.000, "glitch", 0.30, -0.2, seed=4)
    cue(14.533, "alarm", 0.42)
    cue(14.533, "impact", 0.50)
    cue(15.067, "subhit", 0.50)
    cue(16.267, "impact", 0.68)

    # showreel
    cue(19.200, "riser", 0.40, 0.0, dur=1.1)
    cue(19.200, "impact", 0.74)
    cue(20.400, "data", 0.24, -0.3)
    cue(23.200, "tick", 0.24, 0.2)
    cue(24.800, "glitch", 0.26, -0.2, seed=5)
    cue(26.400, "recheck", 0.30)
    cue(27.800, "chime", 0.32, 0.2, freq=1046.5)
    cue(29.200, "key", 0.16, -0.1)
    cue(30.400, "whoosh", 0.28, 0.0, dur=0.5)
    cue(30.700, "coin", 0.30, 0.1)
    cue(31.600, "alarm", 0.27)
    cue(32.600, "blip", 0.24, -0.2, freq=660)
    for i in range(3):
        cue(33.400 + i * 0.08, "toggle", 0.20, 0.2)
    cue(34.200, "chime", 0.26, 0.0, freq=1318.5)
    for i in range(4):
        cue(35.000 + i * 0.10, "counter", 0.14, 0.0)
    cue(36.200, "riser", 0.38, 0.0, dur=1.0)
    cue(36.200, "impact", 0.50)

    # montage zaps, stepping up an A-minor scale
    ztimes = [36.533, 36.867, 37.167, 37.467, 37.733, 38.000, 38.233, 38.467, 38.667]
    znotes = [440.0, 493.9, 554.4, 659.3, 740.0, 880.0, 987.8, 1108.7, 1318.5]
    for i, (zt, zf) in enumerate(zip(ztimes, znotes)):
        cue(zt, "zap", 0.26, -0.5 if i % 2 else 0.5, freq=zf)

    # outro + drop
    cue(39.200, "impact", 0.56)
    cue(39.200, "whoosh", 0.26, -0.1, dur=0.9)
    cue(42.200, "riser", 0.50, 0.0, dur=3.0)
    cue(42.200, "impact", 0.96)

    # CTA
    cue(43.600, "whoosh", 0.32, -0.2, dur=0.6)
    cue(44.000, "sparkle", 0.28, 0.2)
    cue(44.670, "chime", 0.28, -0.2, freq=880)
    cue(46.730, "riser", 0.36, 0.0, dur=1.4)
    cue(46.730, "chime", 0.34, 0.0, freq=1046.5)
    cue(48.200, "sparkle", 0.24, 0.3)
    cue(49.867, "shimmer", 0.30, 0.0)
    cue(51.800, "impact", 0.84)
    cue(52.600, "powerdown", 0.44)

    return l, r, cues


# --------------------------------------------------------------------------
# routing / processing
# --------------------------------------------------------------------------

def write_wav(path: Path, left: np.ndarray, right: np.ndarray) -> None:
    data = np.stack([left, right], axis=1)
    data = np.clip(data, -1.0, 1.0)
    pcm = (data * 32767.0).astype("<i2")
    with wave.open(str(path), "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(pcm.tobytes())


def db(x: float) -> float:
    return 20.0 * math.log10(max(x, 1e-12))


def rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(x.astype(np.float64) ** 2))) if len(x) else 0.0


def main() -> None:
    print("synthesising music…")
    music_l, music_r, _, stems = make_music()
    print("synthesising sfx…")
    sfx_l, sfx_r, cues = make_sfx_bus()

    # Build the bed: quiet logo, lift through the manifesto, breathe in the
    # break, then push the showreel and land loud on the CTA.
    curve = np.interp(
        T,
        [0.0, 4.0, 11.0, 14.4, 19.2, 36.2, 39.2, 42.2, DUR],
        [0.78, 0.90, 0.82, 0.94, 1.00, 1.05, 0.92, 1.08, 1.08],
    )
    music_l *= curve
    music_r *= curve

    # Balance the bed and the effects. The final loudnorm stage does the rest.
    music_peak = max(float(np.max(np.abs(music_l))), float(np.max(np.abs(music_r))))
    sfx_peak = max(float(np.max(np.abs(sfx_l))), float(np.max(np.abs(sfx_r))))
    music_scale = 0.72 / max(music_peak, 1e-9)
    sfx_scale = 0.92 / max(sfx_peak, 1e-9)
    music_l *= music_scale
    music_r *= music_scale
    sfx_l *= sfx_scale
    sfx_r *= sfx_scale

    mix_l = music_l + sfx_l
    mix_r = music_r + sfx_r

    # master tone: remove rumble and extreme top, add presence, gentle glue
    mix_l = high_shelf(fft_filter(mix_l, high=30, low=18500))
    mix_r = high_shelf(fft_filter(mix_r, high=30, low=18500))
    peak = max(float(np.max(np.abs(mix_l))), float(np.max(np.abs(mix_r))))
    if peak > 0:
        mix_l /= peak
        mix_r /= peak
    mix_l = np.tanh(mix_l * 1.15) / np.tanh(1.15)
    mix_r = np.tanh(mix_r * 1.15) / np.tanh(1.15)
    peak = max(float(np.max(np.abs(mix_l))), float(np.max(np.abs(mix_r))))
    mix_l = mix_l / peak * 0.94
    mix_r = mix_r / peak * 0.94

    # clean edges: the video ends on black, so let the tail go to zero
    fi = min(N, ns(0.008))
    fo = min(N, ns(0.22))
    mix_l[:fi] *= np.linspace(0.0, 1.0, fi)
    mix_r[:fi] *= np.linspace(0.0, 1.0, fi)
    mix_l[-fo:] *= np.linspace(1.0, 0.0, fo) ** 1.35
    mix_r[-fo:] *= np.linspace(1.0, 0.0, fo) ** 1.35

    raw_path = OUT / "mix_raw.wav"
    write_wav(raw_path, mix_l, mix_r)
    write_wav(STEMS / "music.wav", music_l, music_r)
    write_wav(STEMS / "sfx.wav", sfx_l, sfx_r)
    for name, (sl, sr) in stems.items():
        write_wav(STEMS / f"{name}.wav", sl, sr)

    # two-pass EBU R128 to -14 LUFS / -1 dBTP
    print("mastering…")
    p1 = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-y", "-i", str(raw_path),
            "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json",
            "-f", "null", "-",
        ],
        capture_output=True, text=True,
    )
    match = re.search(r"\{[\s\S]*?\}", p1.stderr)
    if not match:
        raise RuntimeError("loudnorm pass 1 did not return JSON:\n" + p1.stderr[-2000:])
    measured = json.loads(match.group(0))
    print("loudnorm pass 1:", measured)

    out_path = PUBLIC / "langwars-mix.wav"
    p2 = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-y", "-i", str(raw_path),
            "-af",
            "loudnorm=I=-14:TP=-1:LRA=11:"
            f"measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:"
            f"measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}:"
            f"offset={measured['target_offset']}:linear=true:print_format=summary",
            "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le",
            str(out_path),
        ],
        capture_output=True, text=True,
    )
    if p2.returncode != 0:
        raise RuntimeError("loudnorm pass 2 failed:\n" + p2.stderr[-2000:])
    print("mastered:", out_path)

    # measure the final WAV
    q = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-i", str(out_path),
            "-af", "ebur128=peak=true", "-f", "null", "-",
        ],
        capture_output=True, text=True,
    )
    summary = q.stderr[-4000:]
    integrated = re.findall(r"I:\s*(-?\d+(?:\.\d+)?)\s*LUFS", summary)
    true_peak = re.findall(r"Peak:\s*(-?\d+(?:\.\d+)?)\s*dBFS", summary)
    print("measured final:", integrated[-1] if integrated else "?", "LUFS",
          true_peak[-1] if true_peak else "?", "dBFS")

    meta = {
        "bpm": BPM,
        "bars": BARS,
        "duration": DUR,
        "sample_rate": SR,
        "integrated_lufs": float(integrated[-1]) if integrated else None,
        "true_peak_dbfs": float(true_peak[-1]) if true_peak else None,
        "sections": [
            {"from": 0.0, "to": 4.0, "name": "intro"},
            {"from": 4.0, "to": 11.0, "name": "manifesto"},
            {"from": 11.0, "to": 19.2, "name": "break"},
            {"from": 19.2, "to": 42.2, "name": "showreel"},
            {"from": 42.2, "to": DUR, "name": "cta"},
        ],
        "cues": cues,
        "outputs": {
            "mix": "public/audio/langwars-mix.wav",
            "music": "out/stems/music.wav",
            "sfx": "out/stems/sfx.wav",
        },
    }
    (OUT / "soundtrack.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {len(cues)} cues, {out_path.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
