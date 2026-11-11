#!/usr/bin/env python3
"""Procedurally generate the chiptune bed and all sound effects.

Everything is synthesized from scratch with numpy so the video render has no
external audio dependencies or licensing surprises.
"""

import pathlib
import wave

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio"
SR = 44100
TAU = np.pi * 2


def save(name: str, data: np.ndarray) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    data = np.clip(data, -1.0, 1.0)
    if data.ndim == 1:
        data = np.stack([data, data], axis=-1)
    with wave.open(str(OUT / name), "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes((data * 32767).astype("<i2").tobytes())


def env(n: int, attack: float, decay: float, power: float = 2.0) -> np.ndarray:
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    d = np.exp(-np.clip(t / max(decay, 1e-4), 0, 1) * power * 4)
    return a * d


def square(freq: float, n: int, duty: float = 0.5) -> np.ndarray:
    t = np.arange(n) / SR
    return np.where((t * freq) % 1.0 < duty, 1.0, -1.0)


def saw(freq: float, n: int) -> np.ndarray:
    t = np.arange(n) / SR
    return 2.0 * ((t * freq) % 1.0) - 1.0


def triangle(freq: float, n: int) -> np.ndarray:
    t = np.arange(n) / SR
    return 2.0 * np.abs(2.0 * ((t * freq) % 1.0) - 1.0) - 1.0


def sine(freq: float, n: int) -> np.ndarray:
    return np.sin(TAU * freq * np.arange(n) / SR)


def noise(n: int, seed: int = 7) -> np.ndarray:
    return np.random.default_rng(seed).uniform(-1, 1, n)


def lowpass(x: np.ndarray, alpha: float) -> np.ndarray:
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += alpha * (v - acc)
        y[i] = acc
    return y


def place(buf: np.ndarray, clip: np.ndarray, at: float, gain: float = 1.0) -> None:
    start = int(at * SR) % len(buf)
    n = len(clip)
    idx = (start + np.arange(n)) % len(buf)
    np.add.at(buf, idx, clip * gain)


def make_bgm() -> None:
    bpm = 120
    beat = 60 / bpm
    bars = 8
    length = int(bars * 4 * beat * SR)
    buf = np.zeros(length)

    prog = [
        [220.0, 261.63, 329.63],  # Am
        [174.61, 220.0, 261.63],  # F
        [130.81, 164.81, 196.0],  # C
        [196.0, 246.94, 293.66],  # G
    ] * 2

    for bar, chord in enumerate(prog):
        bar_t = bar * 4 * beat
        root = chord[0] / 2
        for step in range(8):
            t = bar_t + step * beat / 2
            n = int(len(buf) if False else beat / 2 * SR * 0.9)
            tone = square(root, n, 0.35) * 0.16
            place(buf, tone * env(n, 0.004, 0.09, 1.2), t)
        for step in range(16):
            t = bar_t + step * beat / 4
            note = chord[step % len(chord)] * 2
            n = int(beat / 4 * SR * 0.85)
            tone = triangle(note, n) * 0.07
            place(buf, tone * env(n, 0.002, 0.06, 1.5), t)
        pad_n = int(4 * beat * SR)
        pad = sum(triangle(f, pad_n) for f in chord) / 3.0 * 0.05
        place(buf, pad * env(pad_n, 0.25, 0.7, 0.8), bar_t)

    for bar in range(bars):
        bar_t = bar * 4 * beat
        for beat_i in range(4):
            t = bar_t + beat_i * beat
            if beat_i in (0, 2):
                n = int(0.16 * SR)
                kick = sine(52, n) * np.exp(-np.arange(n) / SR * 26)
                place(buf, kick * 0.5, t)
            else:
                n = int(0.14 * SR)
                snare = lowpass(noise(n, 3), 0.5) * env(n, 0.001, 0.05, 2.0)
                place(buf, snare * 0.18, t)
            for h in range(4):
                ht = t + h * beat / 4
                n = int(0.035 * SR)
                hat = noise(n, 11) * env(n, 0.001, 0.012, 2.0)
                place(buf, hat * (0.05 if h % 2 else 0.08), ht)

    save("bgm.wav", buf * 0.9)


def make_sfx() -> None:
    # Keyboard click
    n = int(0.06 * SR)
    click = noise(n, 2) * env(n, 0.001, 0.01, 2.0)
    click += sine(1800, n) * env(n, 0.001, 0.008, 2.0) * 0.4
    save("key.wav", click * 0.5)

    # Glitch burst
    n = int(0.45 * SR)
    g = noise(n, 5) * np.repeat(noise(n // 40 + 1, 6), 40)[:n]
    g = np.round(g * 6) / 6
    g *= env(n, 0.002, 0.18, 1.4)
    save("glitch.wav", g * 0.5)

    # Error buzz
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    f = 220 * np.exp(-t * 1.6)
    err = np.sign(np.sin(TAU * np.cumsum(f) / SR)) * 0.5
    err *= env(n, 0.005, 0.25, 1.2)
    save("error.wav", err * 0.45)

    # Success arpeggio
    seq = [523.25, 659.25, 783.99, 1046.5]
    n_total = int(0.9 * SR)
    out = np.zeros(n_total)
    for i, f in enumerate(seq):
        n = int(0.35 * SR)
        at = int(i * 0.09 * SR)
        note = triangle(f, n) * env(n, 0.002, 0.16, 1.6)
        out[at : at + n] += note * 0.24
    save("success.wav", out * 0.9)

    # Whoosh
    n = int(0.75 * SR)
    w = lowpass(noise(n, 9), 0.08)
    w = w - lowpass(w, 0.02)
    w *= np.sin(np.linspace(0, np.pi, n)) ** 2
    save("whoosh.wav", w * 0.7)

    # Cat meow (formant-ish glide)
    n = int(0.85 * SR)
    t = np.arange(n) / SR
    f = 480 + 260 * np.sin(np.pi * np.clip(t / 0.85, 0, 1)) + 40 * np.sin(TAU * 7 * t)
    phase = TAU * np.cumsum(f) / SR
    meow = np.sign(np.sin(phase)) * 0.35 + np.sin(2 * phase) * 0.2 + np.sin(3 * phase) * 0.1
    meow = lowpass(meow, 0.35)
    meow *= env(n, 0.03, 0.4, 1.4)
    save("meow.wav", meow * 0.55)

    # Impact boom
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    boom = np.sin(TAU * np.cumsum(90 * np.exp(-t * 2.4)) / SR)
    boom *= env(n, 0.002, 0.5, 1.6)
    boom += lowpass(noise(n, 12), 0.05) * env(n, 0.001, 0.12, 2.0) * 0.4
    save("boom.wav", boom * 0.75)

    # Ding
    n = int(0.9 * SR)
    ding = (sine(1318.5, n) + sine(1975.5, n) * 0.5) * env(n, 0.002, 0.3, 1.4)
    save("ding.wav", ding * 0.3)

    # Pop
    n = int(0.14 * SR)
    t = np.arange(n) / SR
    pop = sine(900 * np.exp(-t * 18), n) * env(n, 0.001, 0.04, 2.0)
    save("pop.wav", pop * 0.4)

    # Riser
    n = int(2.0 * SR)
    t = np.arange(n) / SR
    f = 180 * np.exp(t * 1.1)
    riser = saw(1, n) * 0
    phase = TAU * np.cumsum(f) / SR
    riser = np.sin(phase) * 0.3 + noise(n, 4) * 0.2
    riser *= np.linspace(0, 1, n) ** 1.6
    save("riser.wav", lowpass(riser, 0.25) * 0.6)

    # Power down
    n = int(1.1 * SR)
    t = np.arange(n) / SR
    f = 520 * np.exp(-t * 2.2)
    down = np.sign(np.sin(TAU * np.cumsum(f) / SR)) * 0.3
    down *= env(n, 0.005, 0.5, 1.2)
    save("powerdown.wav", down * 0.5)

    # Record scratch
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    gate = (np.sin(TAU * 11 * t) > 0).astype(float)
    scratch = lowpass(noise(n, 21), 0.6) * gate
    scratch *= env(n, 0.005, 0.3, 1.4)
    save("scratch.wav", scratch * 0.35)

    # Locked / denied thud for rejected submission
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    deny = np.sign(np.sin(TAU * np.cumsum(160 * np.exp(-t * 4)) / SR)) * 0.3
    deny *= env(n, 0.002, 0.2, 1.6)
    save("deny.wav", deny * 0.5)

    # Tiny tick (recheck scan)
    n = int(0.05 * SR)
    tick = sine(2400, n) * env(n, 0.001, 0.01, 2.0)
    save("tick.wav", tick * 0.3)


if __name__ == "__main__":
    make_bgm()
    make_sfx()
    print("Audio written to", OUT)
