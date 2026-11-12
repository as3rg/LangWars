import React from "react";
import { Audio } from "@remotion/media";
import { interpolate, staticFile } from "remotion";

export const MusicBed: React.FC<{
  durationInFrames: number;
  volume?: number;
}> = ({ durationInFrames, volume = 0.14 }) => {
  return (
    <Audio
      name="Retro theme"
      src={staticFile("music/retro_loop.wav")}
      loop
      volume={(frame) =>
        interpolate(
          frame,
          [0, 15, durationInFrames - 20, durationInFrames],
          [0, volume, volume, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        )
      }
    />
  );
};
