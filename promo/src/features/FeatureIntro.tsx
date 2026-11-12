import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { FeatureBackground, FeatureHeader } from "./FeatureChrome";
import { JunkBall } from "./JunkBall";

export const FeatureIntro: React.FC = () => {
  const frame = useCurrentFrame();

  const entry = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill>
      <FeatureBackground />
      <FeatureHeader index="LWLANG · OVERVIEW" />

      <div
        style={{
          position: "absolute",
          left: 580,
          top: 120,
          opacity: entry,
          scale: interpolate(frame, [0, 18], [0.94, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <JunkBall size={760} />
      </div>
    </AbsoluteFill>
  );
};
