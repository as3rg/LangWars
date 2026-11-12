import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { FeatureBackground, FeatureHeader, FeatureTitle } from "./FeatureChrome";
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
      <FeatureTitle
        kicker="MEET LWLANG"
        title="THE MODERN, USER-FRIENDLY LANGUAGE"
        subtitle="some assembly required · mostly duct tape"
        maxWidth={620}
      />

      <div
        style={{
          position: "absolute",
          left: 760,
          top: 170,
          opacity: entry,
          scale: interpolate(frame, [0, 18], [0.94, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <JunkBall size={700} />
      </div>
    </AbsoluteFill>
  );
};
