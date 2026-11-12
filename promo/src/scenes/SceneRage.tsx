import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Character } from "../components/Character";
import { COLORS } from "../theme";

export const SceneRage: React.FC = () => {
  const frame = useCurrentFrame();

  const shakeAmp = interpolate(frame, [0, 16, 40, 66], [0, 9, 17, 11], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shakeX = Math.sin(frame * 2.1) * shakeAmp;
  const shakeY = Math.cos(frame * 2.7) * shakeAmp * 0.72;

  const pulse = 1 + Math.sin(frame * 0.42) * 0.018;

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 42%, #3d0c0c 0%, #1c0708 44%, #07080c 100%)",
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(900px 760px at 50% 44%, rgba(248, 81, 73, 0.38), transparent 66%)",
          opacity: interpolate(frame, [0, 16], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />

      {Array.from({ length: 16 }).map((_, index) => {
        const speed = 10 + (index % 5) * 5;
        const offset = (frame * speed + index * 197) % 2400;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: -420,
              top: 72 + index * 58,
              width: 280 + (index % 4) * 220,
              height: 3,
              borderRadius: 999,
              background:
                index % 3 === 0
                  ? "rgba(248, 81, 73, 0.30)"
                  : "rgba(248, 81, 73, 0.14)",
              translate: `${offset}px 0px`,
              rotate: "-2deg",
            }}
          />
        );
      })}

      {Array.from({ length: 6 }).map((_, index) => {
        const drift = (frame * (2.2 + index * 0.35) + index * 70) % 250;
        const size = 54 + index * 16;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: 590 + index * 128,
              top: 640 - drift,
              width: size,
              height: size,
              borderRadius: "50%",
              border: "2px solid rgba(248, 81, 73, 0.22)",
              background: "rgba(248, 81, 73, 0.05)",
              opacity:
                0.18 +
                0.22 *
                  Math.abs(Math.sin((frame + index * 24) / 26)),
            }}
          />
        );
      })}

      <AbsoluteFill
        style={{
          display: "grid",
          placeItems: "center",
          translate: `${shakeX}px ${shakeY - 8}px`,
        }}
      >
        <div
          style={{
            scale: pulse,
            filter:
              "drop-shadow(0 0 70px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 40px rgba(248, 81, 73, 0.25))",
          }}
        >
          <Character mood="rage" width={640} />
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 12,
          background: COLORS.red,
          opacity: interpolate(frame, [0, 2, 10], [0.9, 0.5, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 110,
          background:
            "linear-gradient(to bottom, rgba(7, 8, 12, 0.85), transparent)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 150,
          background:
            "linear-gradient(to top, rgba(7, 8, 12, 0.9), transparent)",
        }}
      />
    </AbsoluteFill>
  );
};
