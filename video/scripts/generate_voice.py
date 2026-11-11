#!/usr/bin/env python3
"""Generate narration and Neko-9 voice lines with edge-tts.

Writes MP3 files into public/audio/voice/ and a manifest with measured
durations into src/generated/voice-manifest.json.
"""

import json
import pathlib
import subprocess
import sys

from mutagen.mp3 import MP3

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio" / "voice"
MANIFEST = ROOT / "src" / "generated" / "voice-manifest.json"
NARRATION = ROOT / "scripts" / "narration.json"

EDGE = sys.argv[1] if len(sys.argv) > 1 else "edge-tts"


def synth(text: str, voice: str, rate: str, pitch: str, dest: pathlib.Path) -> None:
    cmd = [
        EDGE,
        "--voice",
        voice,
        "--text",
        text,
        "--rate",
        rate,
        "--pitch",
        pitch,
        "--write-media",
        str(dest),
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    data = json.loads(NARRATION.read_text(encoding="utf-8"))
    manifest: dict[str, dict[str, float]] = {}

    for lang, cfg in data.items():
        manifest[lang] = {}
        for line in cfg["lines"]:
            is_neko = bool(line.get("neko"))
            voice = cfg["nekoVoice"] if is_neko else cfg["voice"]
            rate = "+22%" if is_neko else cfg["rate"]
            pitch = "+55Hz" if is_neko else "+0Hz"
            dest = OUT / f"{lang}-{line['id']}.mp3"
            synth(line["text"], voice, rate, pitch, dest)
            duration = MP3(dest).info.length
            manifest[lang][line["id"]] = round(duration, 3)
            print(f"{dest.name:24s} {duration:6.2f}s  ({voice})")

    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"\nWrote {MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
