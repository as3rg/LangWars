import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { clamp } from "../lib/theme";

export const SceneShell: React.FC<{
  duration: number;
  children: React.ReactNode;
}> = ({ duration, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 130, mass: 0.8 },
  });
  const exit = interpolate(frame, [duration - 18, duration - 2], [1, 0], clamp);
  return (
    <AbsoluteFill
      style={{
        opacity: enter * exit,
        transform: `translateY(${(1 - enter) * 30}px) scale(${0.985 + enter * 0.015})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
