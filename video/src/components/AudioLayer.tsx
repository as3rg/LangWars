import React from "react";
import { Audio } from "@remotion/media";
import {
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { Lang, SceneTiming } from "../lib/script";
import { clamp } from "../lib/theme";

type Sfx = {
  name: string;
  at: number;
  volume?: number;
  rate?: number;
};

const clicks = (start: number, count: number, step = 0.12): Sfx[] =>
  Array.from({ length: count }, (_, i) => ({
    name: "key",
    at: start + i * step,
    volume: 0.5,
  }));

const ticks = (start: number, count: number, step = 0.18): Sfx[] =>
  Array.from({ length: count }, (_, i) => ({
    name: "tick",
    at: start + i * step,
    volume: 0.4,
  }));

const SFX: Record<string, Sfx[]> = {
  s1: [
    ...clicks(0.7, 14, 0.1),
    { name: "success", at: 3.1, volume: 0.8 },
    { name: "whoosh", at: 4.2 },
    { name: "error", at: 5.0 },
    { name: "boom", at: 6.6 },
    { name: "powerdown", at: 7.2 },
    { name: "ding", at: 9.2, volume: 0.6 },
  ],
  s2: [
    { name: "whoosh", at: 0.25 },
    { name: "pop", at: 1.2 },
    { name: "success", at: 2.5, volume: 0.7 },
    { name: "pop", at: 2.9 },
    { name: "ding", at: 6.0, volume: 0.6 },
    { name: "glitch", at: 8.8, volume: 0.7 },
    { name: "error", at: 9.4, volume: 0.7 },
    { name: "scratch", at: 9.9, volume: 0.8 },
  ],
  s3: [
    { name: "success", at: 1.2, volume: 0.7 },
    { name: "scratch", at: 4.2 },
    { name: "glitch", at: 4.8 },
    { name: "powerdown", at: 7.5 },
    { name: "boom", at: 8.1, volume: 0.6 },
    { name: "ding", at: 12.2, volume: 0.8 },
    { name: "meow", at: 12.8, volume: 0.8 },
  ],
  s4: [
    { name: "pop", at: 3.0 },
    { name: "riser", at: 4.2, volume: 0.5 },
    { name: "pop", at: 4.3 },
    { name: "glitch", at: 6.1, volume: 0.7 },
    { name: "ding", at: 10.2, volume: 0.6 },
    { name: "pop", at: 10.4 },
    { name: "success", at: 16.2, volume: 0.6 },
    { name: "pop", at: 16.4 },
    { name: "meow", at: 21.1, volume: 0.7 },
  ],
  s5: [
    { name: "riser", at: 0.4, volume: 0.5 },
    ...ticks(3.0, 34, 0.18),
    { name: "glitch", at: 9.2, volume: 0.8 },
    { name: "success", at: 12.0, volume: 0.7 },
    { name: "ding", at: 12.2, volume: 0.6 },
  ],
  s6: [
    { name: "pop", at: 4.0 },
    { name: "ding", at: 4.6, volume: 0.7 },
    ...ticks(6.0, 7, 0.45),
    { name: "success", at: 9.6, volume: 0.8 },
    { name: "meow", at: 14.0, volume: 0.7 },
    { name: "riser", at: 15.0, volume: 0.4 },
  ],
  s7: [
    { name: "riser", at: 0.15, volume: 0.6 },
    { name: "boom", at: 1.0 },
    { name: "success", at: 1.4, volume: 0.8 },
    { name: "ding", at: 3.0, volume: 0.7 },
    { name: "whoosh", at: 6.0, volume: 0.8 },
    { name: "meow", at: 8.2, volume: 0.8 },
  ],
};

export const AudioLayer: React.FC<{
  lang: Lang;
  scenes: SceneTiming[];
}> = ({ lang, scenes }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const bgmVolume = interpolate(
    frame,
    [0, 24, durationInFrames - 70, durationInFrames - 10],
    [0, 0.2, 0.2, 0],
    clamp,
  );

  return (
    <>
      <Audio src={staticFile("audio/bgm.wav")} loop volume={bgmVolume} />

      {scenes.map((scene) => {
        const narrationFrom = scene.from + Math.round(scene.narrationStart * 30);
        const nekoFrom = scene.from + Math.round(scene.nekoStart * 30);
        return (
          <React.Fragment key={scene.id}>
            <Sequence from={narrationFrom} name={`narration-${scene.id}`}>
              <Audio
                src={staticFile(`audio/voice/${lang}-${scene.narration}.mp3`)}
                volume={1}
              />
            </Sequence>
            {scene.neko && (
              <Sequence from={nekoFrom} name={`neko-${scene.id}`}>
                <Audio
                  src={staticFile(`audio/voice/${lang}-${scene.neko}.mp3`)}
                  volume={1}
                  toneFrequency={1.18}
                />
              </Sequence>
            )}
            {(SFX[scene.id] ?? []).map((sfx, i) => (
              <Sequence
                key={`${scene.id}-sfx-${i}`}
                from={scene.from + Math.round(sfx.at * 30)}
                name={`${scene.id}-${sfx.name}`}
              >
                <Audio
                  src={staticFile(`audio/${sfx.name}.wav`)}
                  volume={sfx.volume ?? 0.8}
                  playbackRate={sfx.rate ?? 1}
                />
              </Sequence>
            ))}
          </React.Fragment>
        );
      })}
    </>
  );
};
