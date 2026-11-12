#!/usr/bin/env python3
"""LangWars promo — brostep soundtrack, synthesised locally.

Deterministic (fixed seed), numpy-only synthesis. Every hit is placed on an
exact video frame (30 fps, 1600 frames = 53.333 s), so drops, impacts, stutters
and wobbles land on cuts and on-screen actions instead of a free-running grid.

Writes:
  public/audio/langwars-promo-v2.wav   full mix, 44.1 kHz stereo 16-bit
  out/stems-v2/*.wav                   per-bus stems
  out/soundtrack-v2.json               event map (frame / time / sample)

Usage:
  video/.venv-sound/bin/python video/tools/make_soundtrack_v2.py

On NixOS numpy may need the matching libstdc++/zlib on LD_LIBRARY_PATH when the
venv is used outside the dev shell.
"""

from __future__ import annotations

import json
import wave
from pathlib import Path

import numpy as np

SR = 44100
FPS = 30
FRAMES = 1600
DURATION = FRAMES / FPS
N = int(round(DURATION * SR))
SEED = 20261112
BPM = 150
BEAT = 12  # frames per beat at 150 BPM / 30 fps
BAR = 48  # frames per bar

rng = np.random.default_rng(SEED)

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "public" / "audio"
STEM_DIR = ROOT / "out" / "stems-v2"
MAP_PATH = ROOT / "out" / "soundtrack-v2.json"
MIX_PATH = AUDIO_DIR / "langwars-promo-v2.wav"

BUS_NAMES = ("drums", "bass", "music", "lead", "sfx")
BUSES = {name: np.zeros((2, N), dtype=np.float32) for name in BUS_NAMES}
KICKS: list[float] = []
EVENTS: list[dict] = []


# --------------------------------------------------------------------------- utils


def smp(frame: float) -> int:
    return int(round(frame * SR / FPS))


def mark(frame: float, name: str, gain: float = 1.0) -> None:
    EVENTS.append(
        {
            "frame": round(frame, 3),
            "time": round(frame / FPS, 4),
            "sample": smp(frame),
            "name": name,
            "gain": round(gain, 3),
        }
    )


def add(bus: str, sig: np.ndarray, frame: float, gain: float = 1.0, pan: float = 0.0) -> None:
    start = smp(frame)
    if sig.ndim == 1:
        angle = (pan + 1.0) * np.pi / 4.0
        st = np.vstack((sig * np.cos(angle), sig * np.sin(angle)))
    else:
        st = sig
    if start < 0:
        st = st[:, -start:]
        start = 0
    end = min(N, start + st.shape[1])
    if end <= start:
        return
    BUSES[bus][:, start:end] += st[:, : end - start].astype(np.float32) * gain


def env(n: int, attack: float = 0.004, release: float = 0.05, decay: float | None = None) -> np.ndarray:
    t = np.arange(n) / SR
    e = np.ones(n, dtype=np.float64)
    if attack > 0:
        e *= np.clip(t / attack, 0.0, 1.0)
    if decay is not None:
        e *= np.exp(-t / decay)
    if release > 0:
        e *= np.clip((n / SR - t) / release, 0.0, 1.0)
    return e


def spectral_shape(sig: np.ndarray, lo: float | None = None, hi: float | None = None, slope: float = 2.0) -> np.ndarray:
    n = len(sig)
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(n, 1.0 / SR)
    shape = np.ones_like(f)
    if hi is not None:
        shape = shape / np.sqrt(1.0 + (f / hi) ** (2.0 * slope))
    if lo is not None:
        shape = shape / np.sqrt(1.0 + (lo / np.maximum(f, 1e-6)) ** (2.0 * slope))
    return np.fft.irfft(spec * shape, n)


def normalize(sig: np.ndarray, peak: float = 1.0) -> np.ndarray:
    m = float(np.max(np.abs(sig))) if len(sig) else 0.0
    return sig / (m + 1e-9) * peak


# --------------------------------------------------------------------------- instruments


def kick(dur: float = 0.62, f0: float = 160.0, f1: float = 44.0, click: float = 0.32) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.03)
    ph = 2.0 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.22)
    sub = np.sin(2.0 * np.pi * f1 * t) * np.exp(-t / 0.32) * 0.7
    tick = rng.standard_normal(n) * np.exp(-t / 0.004) * click
    sig = np.tanh((body + sub + tick) * 1.8)
    return sig * env(n, 0.001, 0.03)


def snare(dur: float = 0.42, tone: float = 175.0, bright: float = 0.7) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = spectral_shape(rng.standard_normal(n), lo=900, hi=9000, slope=1.0) * np.exp(-t / 0.12)
    tonal = (np.sin(2.0 * np.pi * tone * t) + 0.4 * np.sin(2.0 * np.pi * tone * 1.7 * t)) * np.exp(-t / 0.09) * 0.5
    clap = np.zeros(n)
    for k in range(3):
        off = int(k * 0.006 * SR)
        m = n - off
        clap[off:] += rng.standard_normal(m) * np.exp(-np.arange(m) / SR / 0.018)
    clap = spectral_shape(clap, lo=1400) * 0.22
    sig = np.tanh((noise * bright + tonal + clap) * 1.2)
    return sig * env(n, 0.001, 0.03)


def hat(dur: float = 0.09, open_: bool = False) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = spectral_shape(rng.standard_normal(n), lo=6000 if not open_ else 4200, slope=1.0)
    e = np.exp(-t / (0.06 if open_ else 0.024))
    return noise * e * env(n, 0.0005, 0.008)


def crash(dur: float = 1.3) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = spectral_shape(rng.standard_normal(n), lo=4200, slope=1.0) * np.exp(-t / 0.55)
    shimmer = (
        np.sin(2.0 * np.pi * 5300 * t)
        + np.sin(2.0 * np.pi * 7110 * t + 1.0)
        + np.sin(2.0 * np.pi * 9130 * t + 2.0)
    ) * np.exp(-t / 0.3) * 0.05
    return (noise + shimmer) * env(n, 0.001, 0.05)


def impact(dur: float = 1.5, sub: float = 1.0, bright: float = 0.6) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 90.0 * np.exp(-t / 0.18) + 30.0
    ph = 2.0 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.5)
    boom = np.sin(2.0 * np.pi * 34.0 * t) * np.exp(-t / 0.7) * sub
    noise = spectral_shape(rng.standard_normal(n), lo=30, hi=1800, slope=1.0) * np.exp(-t / 0.16) * bright
    metal = (
        np.sin(2.0 * np.pi * 523.0 * t) + 0.6 * np.sin(2.0 * np.pi * 787.0 * t)
    ) * np.exp(-t / 0.28) * 0.08
    return np.tanh((body + boom + noise + metal) * 1.8) * env(n, 0.0008, 0.05)


def sub_hit(dur: float = 0.5, freq: float = 48.0) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = np.sin(2.0 * np.pi * freq * t) * np.exp(-t / 0.3)
    return np.tanh(sig * 2.2) * env(n, 0.002, 0.05)


def riser(dur: float, f0: float = 180.0, f1: float = 1400.0) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    p = np.clip(t / max(dur, 1e-6), 0.0, 1.0)
    f = f0 * (f1 / f0) ** p
    ph = 2.0 * np.pi * np.cumsum(f) / SR
    tone = np.sin(ph) + 0.5 * np.sin(2.0 * ph) + 0.22 * np.sin(3.0 * ph)
    noise = rng.standard_normal(n)
    hp = spectral_shape(noise, lo=1500, slope=1.0)
    return (tone * 0.28 + hp * 0.55 + noise * 0.12 * p) * (p**2) * env(n, 0.002, 0.01)


def downlifter(dur: float = 0.55, f0: float = 1400.0, f1: float = 70.0) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    p = np.clip(t / max(dur, 1e-6), 0.0, 1.0)
    f = f0 * (f1 / f0) ** p
    ph = 2.0 * np.pi * np.cumsum(f) / SR
    tone = np.sin(ph) + 0.4 * np.sin(2.0 * ph)
    noise = spectral_shape(rng.standard_normal(n), lo=500, slope=1.0) * (1.0 - p)
    return (tone * 0.5 + noise * 0.4) * env(n, 0.003, 0.04)


def whoosh(dur: float = 0.3, f0: float = 300.0, f1: float = 3000.0) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    p = np.clip(t / max(dur, 1e-6), 0.0, 1.0)
    f = f0 * (f1 / f0) ** p
    ph = 2.0 * np.pi * np.cumsum(f) / SR
    noise = spectral_shape(rng.standard_normal(n), lo=1200, slope=1.0)
    return (noise * 0.6 + np.sin(ph) * 0.35) * (p**2) * env(n, 0.002, 0.01)


def blip(f0: float = 880.0, f1: float | None = None, dur: float = 0.09) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 if f1 is None else f0 * (f1 / f0) ** np.clip(t / dur, 0, 1)
    ph = 2.0 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.25 * np.sin(2.0 * ph)) * env(n, 0.002, 0.03, decay=0.04)


def tick(freq: float = 2400.0, dur: float = 0.05) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    tone = np.sin(2.0 * np.pi * freq * t) * np.exp(-t / 0.008)
    click = spectral_shape(rng.standard_normal(n), lo=3200, slope=1.0) * np.exp(-t / 0.004)
    return (tone + click * 0.6) * env(n, 0.0005, 0.006)


def stab(freqs: list[float], dur: float = 0.36, cutoff: float = 2600.0, drive: float = 1.3) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for det in (-0.01, 0.0, 0.01):
            fr = f * (1.0 + det)
            hmax = min(24, max(4, int(cutoff * 2.0 / fr)))
            for k in range(1, hmax + 1):
                out += (1.0 / k) * np.sin(2.0 * np.pi * fr * k * t + k * 0.51)
    out = spectral_shape(out, hi=cutoff, slope=1.5)
    out = normalize(out)
    return np.tanh(drive * out * 1.4) * env(n, 0.003, 0.04, decay=0.12)


def lead_note(freq: float, dur: float = 0.3, cutoff: float = 3000.0) -> np.ndarray:
    """Dark pentatonic pluck: two detuned saws, quick decay, soft top."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for det in (-0.004, 0.0, 0.004):
        fr = freq * (1.0 + det)
        hmax = min(16, max(4, int(cutoff * 2.0 / fr)))
        for k in range(1, hmax + 1):
            out += (1.0 / k) * np.sin(2.0 * np.pi * fr * k * t + k * 0.43)
    out = spectral_shape(out, hi=cutoff, slope=1.2)
    out = normalize(out)
    return out * env(n, 0.004, 0.05, decay=0.17)


def pad(
    freqs: list[float],
    dur: float,
    cutoff: float = 900.0,
    attack: float = 0.8,
    release: float = 1.5,
) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for det in (-0.006, 0.0, 0.006):
            fr = f * (1.0 + det)
            hmax = min(12, max(3, int(cutoff * 2.0 / fr)))
            for k in range(1, hmax + 1):
                out += (1.0 / (k**1.4)) * np.sin(2.0 * np.pi * fr * k * t + k * 0.7)
    out = spectral_shape(out, hi=cutoff, slope=1.2)
    return normalize(out) * env(n, attack, release)


def drone(freq: float, dur: float) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = (
        np.sin(2.0 * np.pi * freq * t)
        + 0.35 * np.sin(2.0 * np.pi * freq * 2.0 * t)
        + 0.16 * np.sin(2.0 * np.pi * freq * 3.0 * t)
    )
    return sig * env(n, min(1.2, dur * 0.25), min(1.6, dur * 0.3)) * 0.6


CHORDS = {
    "Am": [110.0, 130.81, 164.81],
    "F": [87.31, 110.0, 130.81],
    "C": [130.81, 164.81, 196.0],
    "G": [98.0, 123.47, 146.83],
}
COLOR_TONES = {"Am": 392.0, "F": 329.63, "C": 493.88, "G": 440.0}
PROGRESSION = ("Am", "F", "C", "G")


def warm_pad(freqs: list[float], dur: float, attack: float = 0.15, release: float = 0.5) -> np.ndarray:
    """Cheap sine-based chord bed: harmonic glue instead of drum noise."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        out += (
            np.sin(2.0 * np.pi * f * t)
            + 0.28 * np.sin(2.0 * np.pi * 2.0 * f * t)
            + 0.12 * np.sin(2.0 * np.pi * 3.0 * f * t)
            + 0.05 * np.sin(2.0 * np.pi * 4.0 * f * t)
        )
    out = spectral_shape(out, hi=1800, slope=1.2)
    return normalize(out) * env(n, attack, release) * 0.7


def pluck(freq: float, dur: float = 0.3, cutoff: float = 2200.0) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    hmax = min(16, max(3, int(cutoff * 1.5 / freq)))
    for k in range(1, hmax + 1):
        out += (1.0 / k) * np.sin(2.0 * np.pi * freq * k * t + k * 0.4)
    out = spectral_shape(out, hi=cutoff, slope=1.4)
    return normalize(out) * env(n, 0.002, 0.06, decay=0.1)


def music_bar(
    start: float,
    chord_name: str,
    lead_gain: float = 0.085,
    pad_gain: float = 0.1,
    arp: bool = True,
    color: bool = False,
    octave: bool = True,
    arp_step: float = 6.0,
    bar_frames: float = BAR,
) -> None:
    chord = CHORDS[chord_name]
    add("music", warm_pad(chord, bar_frames / FPS + 0.25), start, pad_gain)
    if octave:
        add("music", warm_pad([f * 0.5 for f in chord], bar_frames / FPS + 0.25, attack=0.4, release=0.9), start, pad_gain * 0.4)
    if color:
        add("music", warm_pad([COLOR_TONES[chord_name]], bar_frames / FPS + 0.25, attack=0.25, release=0.7), start, pad_gain * 0.35)
    if not arp:
        return
    steps = max(1, int(round(bar_frames / arp_step)))
    pattern = (0, 1, 2, 1, 2, 1, 0, 1)
    note_dur = 0.3 if arp_step >= 5 else 0.16
    for i in range(steps):
        idx = pattern[i % len(pattern)]
        add("music", pluck(chord[idx] * 2.0, dur=note_dur), start + i * arp_step, lead_gain, pan=0.15 if i % 2 else -0.15)


def place_lead(freq: float, frame: float, gain: float = 0.075, dur: float = 0.34, down: bool = False) -> None:
    add("lead", lead_note(freq, dur=dur), frame, gain, pan=0.05)
    if down:
        add("lead", lead_note(freq * 0.5, dur=dur * 1.2, cutoff=2200.0), frame, gain * 0.55, pan=-0.05)


def wobble(
    freq: float,
    dur: float,
    lfo_hz: float = 5.0,
    cut_lo: float = 140.0,
    cut_hi: float = 1600.0,
    q: float = 4.0,
    drive: float = 1.3,
    phase: float | None = None,
    sub: float = 0.55,
) -> np.ndarray:
    """Formant wobble: a saw whose harmonic amplitudes track an LFO-swept
    resonant low-pass. Vectorised additive synthesis, so no filter recursion."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    if phase is None:
        phase = float(rng.uniform(0.0, 2.0 * np.pi))
    lfo_hz = min(lfo_hz, 12.0)
    cut_hi = min(cut_hi, 2400.0)
    lfo = 0.5 * (1.0 + np.sin(2.0 * np.pi * lfo_hz * t + phase))
    lfo = lfo**1.4
    fc = cut_lo * (cut_hi / cut_lo) ** lfo
    out = np.zeros(n)
    hmax = min(24, max(5, int(7000.0 / freq)))
    for k in range(1, hmax + 1):
        fk = k * freq
        if fk > 9000.0:
            break
        amp = (1.0 / k) / np.sqrt((1.0 - (fk / fc) ** 2) ** 2 + (fk / (q * fc)) ** 2)
        out += amp * np.sin(2.0 * np.pi * fk * t + k * 0.37 + phase * 0.5)
    out = normalize(out)
    out = np.tanh(drive * out)
    if sub > 0:
        out += sub * np.sin(2.0 * np.pi * freq * t)
    return out * env(n, 0.004, 0.05)


def glitch(dur: float = 0.18, freq: float = 220.0) -> np.ndarray:
    n = int(dur * SR)
    out = np.zeros(n)
    step = max(1, n // 10)
    for s in range(0, n, step):
        fr = freq * float(rng.choice([0.5, 0.75, 1.0, 1.5, 2.0, 2.5]))
        m = min(step, n - s)
        tt = np.arange(m) / SR
        out[s : s + m] = np.sign(np.sin(2.0 * np.pi * fr * tt + rng.uniform(0, 6))) * 0.7 + 0.3 * rng.standard_normal(m)
    levels = 8.0
    out = np.round(out * levels) / levels
    out = spectral_shape(out, hi=5200, slope=1.0)
    return out * env(n, 0.002, 0.03, decay=dur * 0.6)


# --------------------------------------------------------------------------- drums


def place_kick(frame: float, gain: float = 0.82) -> None:
    KICKS.append(frame)
    mark(frame, "kick", gain)
    add("drums", kick(), frame, gain)


def place_snare(frame: float, gain: float = 0.45) -> None:
    mark(frame, "snare", gain)
    add("drums", snare(), frame, gain)


def place_hat(frame: float, gain: float = 0.09, open_: bool = False, pan: float = 0.2) -> None:
    add("drums", hat(open_=open_), frame, gain, pan=pan)


def drum_bar(
    start: float,
    kicks: tuple[float, ...] = (0, 30),
    snares: tuple[float, ...] = (24,),
    hat_step: float = 6,
    intense: bool = False,
    ghost: bool = False,
    fill: bool = False,
    beat: float = BEAT,
    bar: float = BAR,
) -> None:
    for off in kicks:
        place_kick(start + off, 0.84 if intense else 0.72)
    for off in snares:
        place_snare(start + off, 0.48 if intense else 0.4)
    f = 0.0
    while f < bar - 0.5:
        accent = abs(f % beat) < 0.01
        if accent or f % (beat * 2.0) < 0.01:
            place_hat(start + f, 0.1 if accent else 0.05, pan=0.25 if int(f) % 2 else -0.2)
        f += hat_step
    if fill:
        for off in (bar - 6, bar - 3):
            place_snare(start + off, 0.2)


def bass_bar(
    start: float,
    notes: list[float],
    step: float = BEAT,
    lfo: float = 5.0,
    gain: float = 0.32,
) -> None:
    for i, freq in enumerate(notes):
        frame = start + i * step
        mark(frame, f"bass {freq:.2f}Hz", gain)
        add("bass", wobble(freq, step / FPS + 0.05, lfo_hz=lfo), frame, gain)


def snare_roll(start: float, end: float, step0: float = 4.0, step1: float = 1.5, gain: float = 0.1) -> None:
    f = start
    while f < end:
        p = (f - start) / max(end - start, 1e-6)
        place_snare(f, gain * (0.6 + 0.8 * p))
        f += step0 + (step1 - step0) * p


def switch(frame: float, strength: float = 1.0, name: str = "switch") -> None:
    """Hard cut: no whoosh, just a tick, a short laser drop and a slam."""
    mark(frame, name, strength)
    add("sfx", tick(1500.0 + 250.0 * strength, 0.05), frame, 0.12 * strength)
    add("sfx", downlifter(0.24, 2600.0, 90.0), frame, 0.18 * strength)
    add("sfx", impact(dur=1.1, sub=0.7 * strength, bright=0.4 * strength), frame, 0.34 * strength)
    add("sfx", crash(dur=0.8), frame, 0.06 * strength)


# --------------------------------------------------------------------------- arrangement

# ---------------------------------------------------------------- 00 — logo (0-120)
mark(0, "intro", 1.0)
add("music", pad([110.0, 130.81, 164.81], 100 / FPS, cutoff=750, attack=1.6, release=2.2), 0, 0.24)
add("music", warm_pad(CHORDS["Am"], 100 / FPS, attack=1.6, release=2.2), 0, 0.1)
add("bass", drone(55.0, 100 / FPS), 0, 0.13)
for i, frame in enumerate((20, 26, 32, 38, 44, 50, 56, 62)):
    add("music", pluck((440.0, 523.25, 659.25, 523.25, 440.0, 392.0, 349.23, 440.0)[i]), frame, 0.055, pan=0.15 if i % 2 else -0.15)

for i, frame in enumerate((4, 6, 8, 10, 12, 14, 16, 18)):
    freq = (880.0, 1046.5, 1318.5, 1046.5, 880.0, 1174.7, 1318.5, 1568.0)[i]
    add("sfx", blip(freq, dur=0.06), frame, 0.13, pan=-0.35 if i % 2 else 0.35)
mark(4, "logo LANG", 1.0)
mark(11, "logo WARS", 1.0)

add("sfx", blip(240.0, 980.0, dur=0.22), 34, 0.2, pan=0.3)
mark(34, "neko spring", 1.0)
for frame in (26, 38, 50):
    add("bass", sub_hit(), frame, 0.2)
    mark(frame, "sub hit", 0.2)
for frame in (48, 60, 72, 84, 96):
    place_kick(frame, 0.25 + (frame - 48) / 48 * 0.2)
for i, frame in enumerate((58, 61, 64, 67, 70)):
    add("music", blip((523.25, 587.33, 659.25, 783.99, 880.0)[i], dur=0.12), frame, 0.1)
mark(58, "credits", 0.6)
add("sfx", downlifter(0.28, 2000.0, 180.0), 98, 0.14)
add("sfx", riser(8 / FPS, 300.0, 1400.0), 106, 0.2)
snare_roll(100, 120, 4.0, 2.0, 0.12)

# ---------------------------------------------------------------- 01 — manifesto (120-330)
switch(120, 0.9, "cut logo→manifesto")

B_NOTES = [
    [55.0, 55.0, 65.41, 55.0],
    [55.0, 43.65, 65.41, 49.0],
    [43.65, 43.65, 49.0, 41.2],
    [41.2, 49.0, 55.0, 65.41],
]
for i, bar in enumerate((120, 168, 216, 264)):
    intense = i >= 2
    drum_bar(bar, intense=intense, hat_step=6, fill=i == 3)
    bass_bar(bar, B_NOTES[i], lfo=2.5 if i == 0 else 5.0, gain=0.21 + 0.03 * i)
    music_bar(bar, PROGRESSION[i % 4], lead_gain=0.07, pad_gain=0.09)

# last partial bar 312-330
place_kick(312, 0.82)
place_snare(324, 0.4)
for f in range(312, 330, 6):
    place_hat(f, 0.08)
add("bass", wobble(55.0, 18 / FPS, lfo_hz=5.0, drive=1.4), 312, 0.3)
add("music", warm_pad(CHORDS["Am"], 18 / FPS + 0.2, attack=0.1, release=0.4), 312, 0.1)
for i, frame in enumerate((312, 318, 324)):
    add("music", pluck((440.0, 523.25, 659.25)[i]), frame, 0.07)
mark(312, "bass 55.00Hz", 0.3)

for frame, strength, name in (
    (170, 0.55, "flash cyan"),
    (222, 0.65, "flash violet"),
    (278, 0.95, "flash magenta"),
):
    add("sfx", tick(1900.0, 0.04), frame, 0.09 * strength)
    add("sfx", downlifter(0.2, 2400.0, 120.0), frame, 0.12 * strength)
    add("sfx", impact(dur=0.8, sub=0.5, bright=0.5), frame, 0.26 * strength)
    add("music", stab([220.0, 261.63, 329.63], dur=0.28), frame, 0.2 * strength)
    mark(frame, name, strength)

add("music", stab([220.0, 261.63, 329.63, 440.0], dur=0.5, cutoff=3800), 280, 0.23)
add("sfx", crash(1.2), 280, 0.1)
mark(280, "statement four", 1.0)

snare_roll(318, 330, 3.5, 1.5, 0.11)
add("sfx", riser(8 / FPS, 400.0, 1800.0), 322, 0.18)

# ---------------------------------------------------------------- 02 — break (330-576)
switch(330, 1.05, "cut manifesto→break")
add("music", pad([82.41, 98.0, 123.47], 90 / FPS, cutoff=600, attack=1.2, release=2.0), 330, 0.18)
add("music", warm_pad(CHORDS["F"], 90 / FPS, attack=0.4, release=1.0), 330, 0.11)
add("bass", drone(41.2, 90 / FPS), 330, 0.16)
for i, frame in enumerate((342, 354, 366, 378, 390, 402)):
    add("music", pluck((440.0, 523.25, 659.25, 523.25, 440.0, 349.23)[i]), frame, 0.055, pan=0.2 if i % 2 else -0.2)
mark(330, "break chord F", 0.6)

for frame in (330, 354):
    place_kick(frame, 0.75)
for f in range(330, 420, 6):
    place_hat(f, 0.07 if f % 12 else 0.12, pan=-0.2)

for frame in (340, 344, 348, 352):
    add("sfx", tick(2200.0 + (frame - 340) * 60.0), frame, 0.16, pan=0.2)
mark(340, "typing", 0.5)
add("sfx", blip(330.0, 1320.0, dur=0.2), 374, 0.2)
add("music", stab([174.61, 220.0, 261.63], dur=0.3), 374, 0.18)
mark(374, "submission b enters", 0.8)

snare_roll(410, 420, 4.0, 1.5, 0.13)
add("sfx", riser(10 / FPS, 250.0, 2400.0), 410, 0.2)

switch(420, 1.35, "world breaks (impact)")
add("bass", wobble(55.0, 18 / FPS, lfo_hz=8.0, cut_lo=110, cut_hi=1600, drive=1.5), 420, 0.36)
music_bar(420, "Am", lead_gain=0.06, pad_gain=0.1, color=True)
for off in (0, 12):
    place_kick(420 + off, 1.0)
place_snare(432, 0.5)

switch(436, 1.2, "second impact (broken)")
add("bass", wobble(41.2, 34 / FPS, lfo_hz=9.0, cut_lo=100, cut_hi=1700, drive=1.6), 436, 0.36)
for off in (0, 12, 30):
    place_kick(436 + off, 0.98)
place_snare(460, 0.45)

for off in (0, 15, 30):
    place_kick(468 + off, 0.95)
place_snare(492, 0.45)
bass_bar(468, [41.2, 41.2, 49.0, 41.2], lfo=7.0, gain=0.32)
music_bar(468, "F", lead_gain=0.04, pad_gain=0.1, color=True, arp_step=3)

for i, frame in enumerate((452, 456, 460, 464)):
    add("sfx", glitch(0.16, 180.0 + i * 40), frame, 0.12, pan=-0.4 if i % 2 else 0.4)
    mark(frame, "51→101 stab", 0.5)

switch(488, 1.0, "one name")
add("music", stab([220.0, 261.63, 329.63, 440.0], dur=0.9, cutoff=3200), 488, 0.26)
add("music", pad([110.0, 130.81, 164.81], 40 / FPS, cutoff=1200, attack=0.15, release=0.8), 488, 0.2)
add("music", warm_pad(CHORDS["Am"], 40 / FPS, attack=0.12, release=0.6), 488, 0.13)
add("bass", wobble(55.0, 40 / FPS, lfo_hz=5.0, drive=1.4), 488, 0.34)
for i, frame in enumerate((488, 494, 500, 506)):
    add("music", pluck((440.0, 659.25, 880.0, 659.25)[i], cutoff=2600.0), frame, 0.08, pan=0.15 if i % 2 else -0.15)
for off in (0, 30):
    place_kick(488 + off, 0.98)
place_snare(512, 0.48)

for off in (0, 30):
    place_kick(516 + off, 0.98)
add("sfx", downlifter(0.6, 1600.0, 60.0), 528, 0.14)
mark(528, "name out", 0.7)
add("bass", wobble(55.0, 12 / FPS, lfo_hz=5.0, cut_lo=90, cut_hi=900, drive=1.4), 528, 0.28)

add("music", warm_pad(CHORDS["G"], 34 / FPS, attack=0.15, release=0.4), 540, 0.1)
for i in range(12):
    add("music", pluck((440.0, 523.25, 659.25, 523.25)[i % 4], dur=0.15), 540 + i * 3, 0.035, pan=0.2 if i % 2 else -0.2)
snare_roll(560, 572, 3.5, 1.5, 0.13)
add("sfx", riser(10 / FPS, 300.0, 2600.0), 562, 0.2)
mark(572, "dropout", 1.0)

# ---------------------------------------------------------------- 03 — showreel (576-1266)
switch(576, 1.25, "cut break→showreel")

D_NOTES = [
    [55.0, 55.0, 65.41, 55.0],
    [55.0, 43.65, 65.41, 49.0],
    [49.0, 49.0, 43.65, 41.2],
    [55.0, 82.41, 65.41, 55.0],
    [43.65, 43.65, 49.0, 55.0],
    [55.0, 55.0, 55.0, 49.0],
    [41.2, 49.0, 55.0, 65.41],
    [55.0, 43.65, 49.0, 41.2],
]

bar = 576
i = 0
while bar + BAR <= 1080:
    stage = 0 if i < 5 else (1 if i < 8 else 2)
    kicks = (0, 30) if stage == 0 else ((0, 18, 30) if i % 2 == 0 else (0, 30))
    drum_bar(bar, kicks=kicks, intense=True, hat_step=6, fill=(i % 4 == 3 and stage > 0))
    bass_bar(bar, D_NOTES[i % len(D_NOTES)], lfo=(5.0, 7.0, 10.0)[stage], gain=0.3 + 0.015 * stage)
    music_bar(
        bar,
        PROGRESSION[i % 4],
        lead_gain=(0.065, 0.05, 0.04)[stage],
        pad_gain=0.1,
        color=stage > 0,
        arp_step=6 if stage == 0 else 3,
    )
    bar += BAR
    i += 1

# dark pentatonic hook, one phrase per two bars
LEAD_PHRASES = (
    {0: 440.0, 2: 523.25, 3: 659.25, 5: 587.33, 6: 523.25, 8: 392.0},
    {0: 440.0, 1: 523.25, 3: 659.25, 4: 783.99, 5: 659.25, 6: 587.33, 10: 440.0},
)
for g in range(5):
    start = 576 + g * 96
    phrase = LEAD_PHRASES[g % 2]
    for step, freq in phrase.items():
        place_lead(freq, start + step * 6, gain=0.075, dur=0.34, down=g >= 2)

for frame, name in (
    (612, "beat intro→world"),
    (696, "beat world→rating"),
    (744, "beat rating→language"),
    (792, "beat language→recheck"),
    (834, "beat recheck→events"),
    (876, "beat events→tasks"),
    (912, "beat tasks→publish"),
    (948, "beat publish→submissions"),
    (978, "beat submissions→guide"),
    (1002, "beat guide→admin"),
    (1026, "beat admin→news"),
    (1050, "beat news→revision"),
):
    add("sfx", tick(1700.0, 0.04), frame, 0.07)
    add("sfx", downlifter(0.16, 2200.0, 250.0), frame, 0.1)
    add("music", stab([329.63, 392.0, 493.88], dur=0.18, cutoff=3200), frame, 0.14)
    mark(frame, name, 0.8)

# 646 world row update
add("sfx", downlifter(0.32, 2400.0, 300.0), 646, 0.14)
add("sfx", blip(1400.0, 500.0, dur=0.12), 646, 0.16)
mark(646, "world row updated", 0.8)

# 700-744 rating rows: one soft accent instead of a blip storm
add("sfx", blip(740.0, dur=0.06), 700, 0.05, pan=0.15)

# 800-818 recheck flips
for j in range(6):
    frame = 800.0 + j * 2.5
    add("sfx", blip(1200.0 - j * 40.0, dur=0.035), frame, 0.05, pan=-0.5 + (j % 4) * 0.33)
mark(800, "recheck flips", 0.7)

# 876 tasks typing
for frame in (880, 884, 888):
    add("sfx", tick(2300.0), frame, 0.1)

# 929/933/937 publish arrivals
for j, frame in enumerate((929, 933, 937)):
    add("music", blip((523.25, 659.25, 783.99)[j], dur=0.14), frame, 0.15, pan=0.3)
mark(929, "names published", 0.8)

# 948 submissions: broken
add("sfx", glitch(0.35, 320.0), 948, 0.12)
add("music", stab([174.61, 207.65, 261.63], dur=0.45, cutoff=2200), 948, 0.22)
mark(948, "beta broken", 1.0)

# 982/984/986 guide cards
for j, frame in enumerate((982, 984, 986)):
    add("music", blip((392.0, 523.25, 659.25)[j], dur=0.12), frame, 0.13, pan=-0.3 + j * 0.3)

# 1014/1019/1024 admin toggles
for j, frame in enumerate((1014, 1019, 1024)):
    add("sfx", tick(1500.0 + j * 250.0), frame, 0.1)

# 1030/1033 news cards
for j, frame in enumerate((1030, 1033)):
    add("music", blip((440.0, 587.33)[j], dur=0.15), frame, 0.13)

# 1050-1082 revision counter + fill into montage
add("music", stab([220.0, 261.63, 329.63, 440.0], dur=0.5, cutoff=3600), 1050, 0.2)
for j in range(6):
    add("sfx", blip(600.0 + j * 95.0, dur=0.035), 1054 + j * 2.5, 0.06)
snare_roll(1076, 1086, 3.0, 1.5, 0.13)
add("sfx", riser(6 / FPS, 500.0, 3000.0), 1080, 0.2)

# ---------------------------------------------------------------- montage (1086-1176)
switch(1086, 0.9, "montage start")
add("music", warm_pad(CHORDS["Am"], 90 / FPS, attack=0.2, release=0.5), 1086, 0.13)
MONTAGE = (
    (1086, 55.0, "МИР"),
    (1096, 65.41, "РЕЙТИНГ"),
    (1106, 73.42, "ЯЗЫК"),
    (1115, 82.41, "ИВЕНТЫ"),
    (1124, 87.31, "ЗАДАЧИ"),
    (1132, 98.0, "САБМИТЫ"),
    (1140, 110.0, "ГАЙД"),
    (1148, 130.81, "АДМИН"),
    (1155, 146.83, "НОВОСТИ"),
    (1161, 164.81, "АРЕНА"),
    (1173, 110.0, "АРЕНА ∞"),
)
for idx, (frame, freq, name) in enumerate(MONTAGE):
    place_kick(frame, 0.8)
    place_snare(frame, 0.4)
    add("music", stab([freq, freq * 1.5], dur=0.2, cutoff=3400), frame, 0.18, pan=-0.2 if idx % 2 else 0.2)
    add("lead", lead_note(freq * 2.0, dur=0.26, cutoff=3600), frame, 0.08, pan=0.1 if idx % 2 else -0.1)
    add("bass", sub_hit(0.22, max(36.0, freq / 2.0)), frame, 0.22)
    mark(frame, f"stutter {name}", 1.0)
add("sfx", riser(12 / FPS, 300.0, 4000.0), 1176 - 12, 0.18)

# ---------------------------------------------------------------- outro (1176-1266)
switch(1176, 1.15, "outro")
for g, start in enumerate((1176,)):
    phrase = LEAD_PHRASES[g % 2]
    for step, freq in phrase.items():
        place_lead(freq, start + step * 6, gain=0.075, dur=0.36, down=True)
for bar_start, chord_name, root in ((1176, "Am", 55.0), (1224, "F", 43.65)):
    drum_bar(bar_start, kicks=(0, 30), snares=(24,), intense=True, hat_step=6)
    bass_bar(bar_start, [55.0, 43.65, 49.0, 41.2], lfo=6.0, gain=0.3)
    for k in range(8):
        add("bass", wobble(root, 6 / FPS + 0.02, lfo_hz=8.0, drive=1.1), bar_start + k * 6, 0.05)
    music_bar(bar_start, chord_name, lead_gain=0.07, pad_gain=0.11, color=True)

add("sfx", glitch(0.42, 260.0), 1218, 0.14)
mark(1218, "glitch ТВОЙ ХОД", 1.0)
add("music", stab([220.0, 277.18, 329.63], dur=0.3, cutoff=2000), 1228, 0.16)
snare_roll(1250, 1258, 3.0, 1.5, 0.12)
add("sfx", downlifter(0.34, 1800.0, 120.0), 1252, 0.12)

# ---------------------------------------------------------------- 04 — join (1266-1600) — 180 BPM
E_BEAT = 10.0  # 180 BPM at 30 fps
E_BAR = 40.0
switch(1266, 1.25, "cut showreel→join")

E_NOTES = [
    [55.0, 55.0, 65.41, 55.0],
    [43.65, 49.0, 55.0, 65.41],
    [65.41, 73.42, 82.41, 98.0],
    [55.0, 55.0, 82.41, 65.41],
    [49.0, 49.0, 55.0, 65.41],
    [55.0, 65.41, 55.0, 43.65],
    [55.0, 55.0, 65.41, 82.41],
    [43.65, 49.0, 55.0, 65.41],
]
E_BARS = [1266 + int(E_BAR) * k for k in range(8)]  # 1266 … 1546

for idx, bar_start in enumerate(E_BARS):
    if idx == 3:
        # build into the 1402 final drop
        drum_bar(bar_start, kicks=(0,), snares=(), intense=False, hat_step=5, beat=E_BEAT, bar=E_BAR)
        add("bass", wobble(65.41, E_BAR / FPS, lfo_hz=9.0, drive=1.3), bar_start, 0.24)
        music_bar(bar_start, "C", lead_gain=0.055, pad_gain=0.11, color=True, arp_step=5, bar_frames=E_BAR)
        snare_roll(1390, 1402, 3.0, 1.2, 0.12)
        add("sfx", riser(12 / FPS, 400.0, 3000.0), 1390, 0.18)
    elif idx == 7:
        # final bar: strip to a build so the 1584 hit lands alone
        place_kick(bar_start, 0.82)
        for f in range(int(bar_start), int(bar_start) + 18, 5):
            place_hat(f, 0.08, pan=0.25 if f % 2 else -0.25)
        add("bass", wobble(55.0, 14 / FPS, lfo_hz=10.0, drive=1.4), bar_start, 0.28)
        add("music", warm_pad(CHORDS["Am"], 24 / FPS, attack=0.15, release=0.5), bar_start, 0.11)
    else:
        drum_bar(
            bar_start,
            kicks=(0, 25),
            snares=(20,),
            intense=True,
            hat_step=5,
            fill=idx in (1, 4),
            beat=E_BEAT,
            bar=E_BAR,
        )
        bass_bar(bar_start, E_NOTES[idx], step=E_BEAT, lfo=10.0 if idx < 6 else 12.0, gain=0.3)
        music_bar(
            bar_start,
            ("Am", "F", "C", "G", "Am", "F", "G", "Am")[idx],
            lead_gain=0.04 if idx < 4 else 0.035,
            pad_gain=0.1,
            color=True,
            arp_step=2.5,
            bar_frames=E_BAR,
        )

# 1308 "ЗАХОДИ В ОБЩИЙ МИР" lift
add("music", pad([130.81, 164.81, 196.0, 261.63], 44 / FPS, cutoff=1600, attack=0.2, release=0.8), 1308, 0.2)
mark(1308, "заходи в общий мир", 0.9)

# lead hook returns on the final drop and the brand bar
for g, start in enumerate((1386, 1506)):
    phrase = LEAD_PHRASES[g % 2]
    for step, freq in phrase.items():
        place_lead(freq, start + step * 5, gain=0.075, dur=0.3, down=True)
place_lead(880.0, 1402, gain=0.07, dur=0.9, down=True)

# 1402 final drop
switch(1402, 1.4, "final drop")
add("bass", wobble(55.0, 44 / FPS, lfo_hz=12.0, cut_lo=110, cut_hi=1800, drive=1.5), 1402, 0.38)
add("music", warm_pad(CHORDS["Am"], 44 / FPS, attack=0.08, release=0.5), 1402, 0.13)
for i, frame in enumerate((1402, 1407, 1412, 1417, 1422, 1427)):
    add("music", pluck((880.0, 1046.5, 1318.5, 1046.5, 880.0, 659.25)[i], cutoff=2800.0), frame, 0.08, pan=0.2 if i % 2 else -0.2)
for off in (0, 5):
    place_kick(1402 + off, 1.0)
place_snare(1412, 0.5)
for j, frame in enumerate((1402, 1405, 1408)):
    add("music", stab([110.0 * (1.0, 1.5, 2.0)[j], 164.81 * (1.0, 1.5, 2.0)[j]], dur=0.2, cutoff=4200), frame, 0.2)
    mark(frame, f"claim line {j + 1}", 0.9)

# 1496 brand motif
add("sfx", tick(2100.0, 0.04), 1490, 0.08)
for j, frame in enumerate((1496, 1498, 1500, 1502)):
    add("music", blip((523.25, 659.25, 783.99, 1046.5)[j], dur=0.1), frame, 0.13)
add("music", stab([220.0, 261.63, 329.63], dur=0.35, cutoff=3000), 1496, 0.16)
mark(1496, "brand", 0.8)

# build to final hit
snare_roll(1568, 1582, 3.0, 1.5, 0.13)
add("sfx", riser(14 / FPS, 350.0, 3800.0), 1570, 0.22)
add("bass", wobble(55.0, 20 / FPS, lfo_hz=12.0, cut_lo=90, cut_hi=1600, drive=1.5), 1564, 0.32)

switch(1584, 1.5, "final hit")
add("sfx", impact(dur=2.2, sub=1.2, bright=0.4), 1584, 0.55)
add("sfx", crash(2.0), 1584, 0.12)
add("bass", sub_hit(1.2, 43.65), 1584, 0.4)

# --------------------------------------------------------------------------- mixing


def to_stereo_duck(sig: np.ndarray, kicks: list[float], depth: float = 0.5, tau: float = 0.11) -> np.ndarray:
    duck = np.ones(N, dtype=np.float32)
    m = int(0.28 * SR)
    for frame in kicks:
        s = smp(frame)
        if s >= N:
            continue
        end = min(N, s + m)
        seg = np.clip(1.0 - depth * np.exp(-np.arange(end - s) / SR / tau), 0.05, 1.0)
        duck[s:end] *= seg.astype(np.float32)
    return sig * duck[None, :]


def stereo_fft_filter(sig: np.ndarray, lo: float | None = None, hi: float | None = None, slope: float = 2.0) -> np.ndarray:
    return np.vstack((spectral_shape(sig[0], lo, hi, slope), spectral_shape(sig[1], lo, hi, slope)))


def delay(sig: np.ndarray, delay_frames: float = 12.0, feedback: float = 0.28, mix: float = 0.22, repeats: int = 3) -> np.ndarray:
    d = smp(delay_frames)
    out = sig.astype(np.float64).copy()
    for k in range(1, repeats + 1):
        shift = d * k
        if shift >= N:
            break
        out[:, shift:] += sig[:, : N - shift] * (feedback**k) * mix
    return out


def make_ir(dur: float = 1.5, decay: float = 0.38) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t / decay)
    ir = spectral_shape(ir, lo=220, hi=8500, slope=1.0)
    fade = int(0.012 * SR)
    ir[:fade] *= np.linspace(0.0, 1.0, fade)
    return ir / (np.sqrt(np.sum(ir**2)) + 1e-9)


def convolve_stereo(sig: np.ndarray, ir: np.ndarray) -> np.ndarray:
    n = 1 << (sig.shape[1] + len(ir) - 1).bit_length()
    ir_spec = np.fft.rfft(ir, n)
    out = np.empty_like(sig)
    for ch in range(2):
        out[ch] = np.fft.irfft(np.fft.rfft(sig[ch], n) * ir_spec, n)[: sig.shape[1]]
    return out


BUSES["bass"] = to_stereo_duck(BUSES["bass"], KICKS, depth=0.55)
BUSES["bass"] = stereo_fft_filter(BUSES["bass"].astype(np.float64), hi=2500.0, slope=1.0).astype(np.float32)
BUSES["music"] = to_stereo_duck(BUSES["music"], KICKS, depth=0.38)
BUSES["music"] = delay(BUSES["music"], 12.0, 0.3, 0.16, 3).astype(np.float32)
BUSES["lead"] = to_stereo_duck(BUSES["lead"], KICKS, depth=0.35)
BUSES["lead"] = delay(BUSES["lead"], 12.0, 0.32, 0.22, 3).astype(np.float32)

ir = make_ir()
wet = convolve_stereo(BUSES["music"] + BUSES["lead"] + BUSES["sfx"], ir)
mix = (
    BUSES["drums"].astype(np.float64) * 0.8
    + BUSES["bass"].astype(np.float64)
    + BUSES["music"].astype(np.float64) * 1.45
    + BUSES["lead"].astype(np.float64) * 1.3
    + BUSES["sfx"].astype(np.float64) * 0.9
    + wet * 0.14
)

# mono bass, gentle top/bottom cleanup
low = stereo_fft_filter(mix, hi=130.0, slope=2.0)
mix = mix - low + low.mean(axis=0, keepdims=True)
mix = stereo_fft_filter(mix, lo=24.0, slope=2.0)
mix = stereo_fft_filter(mix, hi=16000.0, slope=1.0)

# master: gentle saturation, section loudness ladder, normalise, fades
mix = mix / (np.max(np.abs(mix)) + 1e-9) * 1.05
mix = np.tanh(mix)

SECTION_GAIN = ((120, 330, 1.07), (330, 576, 1.0), (576, 1266, 1.26), (1266, 1600, 1.32))
section_env = np.ones(N, dtype=np.float64)
for start_frame, end_frame, gain in SECTION_GAIN:
    section_env[smp(start_frame) : smp(end_frame)] = gain
smooth = int(0.004 * SR)
section_env = np.convolve(section_env, np.ones(smooth) / smooth, mode="same")
mix *= section_env[None, :]

mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.93

fade_in = int(0.008 * SR)
mix[:, :fade_in] *= np.linspace(0.0, 1.0, fade_in)
fade_out = int(0.5 * SR)
mix[:, -fade_out:] *= np.linspace(1.0, 0.0, fade_out) ** 1.5

# hard-cut transitions: 2-frame dropouts before every cut, 1-frame before beat switches
CUT_GAPS = (
    (118, 2), (168, 2), (220, 2), (276, 2), (328, 2), (418, 2), (434, 2),
    (574, 2), (1084, 2), (1174, 2), (1264, 2), (1400, 2), (1582, 2),
)
BEAT_GAPS = tuple(
    (frame, 1) for frame in (610, 694, 742, 790, 832, 874, 910, 946, 976, 1000, 1024, 1048)
)


def apply_gates(sig: np.ndarray, gates: tuple[tuple[float, float], ...], ramp: float = 0.0015) -> np.ndarray:
    r = int(ramp * SR)
    for frame, length in gates:
        s = smp(frame)
        e = min(N, smp(frame + length))
        if e <= s:
            continue
        seg = np.zeros(e - s)
        k = min(r, (e - s) // 2)
        if k > 0:
            seg[:k] = np.linspace(1.0, 0.0, k)
            seg[-k:] = np.linspace(0.0, 1.0, k)
        sig[:, s:e] *= seg
    return sig


mix = apply_gates(mix, CUT_GAPS + BEAT_GAPS)

# --------------------------------------------------------------------------- output


def write_wav(path: Path, stereo: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = np.clip(stereo.T, -1.0, 1.0)
    pcm = (data * 32767.0).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


write_wav(MIX_PATH, mix)

STEM_DIR.mkdir(parents=True, exist_ok=True)
stems = {
    "drums": BUSES["drums"],
    "bass": BUSES["bass"],
    "music": BUSES["music"],
    "lead": BUSES["lead"],
    "sfx": BUSES["sfx"],
}
for name, bus in stems.items():
    peak = float(np.max(np.abs(bus))) or 1.0
    write_wav(STEM_DIR / f"{name}.wav", bus / peak * 0.9)

EVENTS.sort(key=lambda item: item["frame"])
MAP_PATH.parent.mkdir(parents=True, exist_ok=True)
MAP_PATH.write_text(
    json.dumps(
        {
            "bpm": BPM,
            "fps": FPS,
            "frames": FRAMES,
            "duration": DURATION,
            "sampleRate": SR,
            "seed": SEED,
            "sections": [
                {"name": "logo", "from": 0, "to": 120, "bpm": 150},
                {"name": "manifesto", "from": 120, "to": 330, "bpm": 150},
                {"name": "break", "from": 330, "to": 576, "bpm": 150},
                {"name": "showreel", "from": 576, "to": 1266, "bpm": 150},
                {"name": "join", "from": 1266, "to": 1600, "bpm": 180},
            ],
            "events": EVENTS,
        },
        ensure_ascii=False,
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)

peak_db = 20.0 * np.log10(np.max(np.abs(mix)) + 1e-12)
rms_db = 20.0 * np.log10(np.sqrt(np.mean(mix**2)) + 1e-12)
print(f"mix:      {MIX_PATH.relative_to(ROOT)}")
print(f"stems:    {STEM_DIR.relative_to(ROOT)}/*.wav")
print(f"map:      {MAP_PATH.relative_to(ROOT)} ({len(EVENTS)} events)")
print(f"samples:  {N} ({N / SR:.4f}s, expected {DURATION:.4f}s)")
print(f"peak:     {peak_db:.2f} dBFS, rms {rms_db:.2f} dBFS")
