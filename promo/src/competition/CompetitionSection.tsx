import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { Sfx, type SfxEvent } from "../audio/Sfx";
import { BasicCaptions } from "../basic-captions.element";
import { ClownCakeFilm } from "./ClownCakeFilm";
import { DuckJoust } from "./DuckJoust";
import { HellFireFilm } from "./HellFireFilm";

const Letterbox: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          background: "#000",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          background: "#000",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 48%, transparent 56%, rgba(0,0,0,0.5) 100%)",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          background: "#000",
          opacity: interpolate(frame, [230, 248], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          pointerEvents: "none",
        }}
      />
    </>
  );
};

const competitionSfx: SfxEvent[] = [
  { src: "whoosh.wav", from: 0, volume: 0.2 },
  { src: "whip.wav", from: 4, volume: 0.18 },
  { src: "mac-quack.wav", from: 18, volume: 0.35 },
  { src: "vine-boom.wav", from: 61, volume: 0.3 },
  { src: "whoosh.wav", from: 75, volume: 0.2 },
  { src: "whip.wav", from: 78, volume: 0.22 },
  { src: "spongebob-fail.wav", from: 113, volume: 0.28 },
  { src: "whoosh.wav", from: 122, volume: 0.18 },
  { src: "bruh.wav", from: 132, volume: 0.35 },
  { src: "whoosh.wav", from: 150, volume: 0.2 },
  { src: "dramatic-boomer.wav", from: 150, volume: 0.25 },
  { src: "omg-hell-nah.wav", from: 156, volume: 0.25 },
  { src: "minecraft-hurt.wav", from: 168, volume: 0.2 },
  { src: "fah.wav", from: 188, volume: 0.18 },
];

export const CompetitionSection: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence
        name="Competition speed"
        durationInFrames={252}
        playbackRate={1.2}
      >
        <Sequence name="Duck jousting" durationInFrames={90}>
          <DuckJoust />
        </Sequence>
        <Sequence name="Cake fight" from={90} durationInFrames={90}>
          <ClownCakeFilm />
        </Sequence>
        <Sequence name="Hell fire" from={180} durationInFrames={72}>
          <HellFireFilm />
        </Sequence>

        <Letterbox />

      </Sequence>
      <Sfx events={competitionSfx} />
    </AbsoluteFill>
  );
};
