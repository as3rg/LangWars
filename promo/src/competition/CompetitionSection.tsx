import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { ClownCakeFilm } from "./ClownCakeFilm";
import { DuckJoust } from "./DuckJoust";
import { HellFireFilm } from "./HellFireFilm";
import { MinecraftSign } from "./MinecraftSign";

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
        <MinecraftSign />
      </Sequence>
    </AbsoluteFill>
  );
};
