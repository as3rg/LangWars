import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { pixelFont } from "../fonts";

export const MinecraftSign: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame: frame - 2,
    fps,
    config: { damping: 15, stiffness: 150, mass: 0.7 },
  });
  const enterOpacity = Math.min(1, Math.max(0, enter));
  const exitOpacity = interpolate(frame, [230, 248], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 84,
        top: 96,
        zIndex: 30,
        opacity: enterOpacity * exitOpacity,
        scale: 0.9 + enterOpacity * 0.1,
        transformOrigin: "top left",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 340,
          height: 118,
          borderRadius: 6,
          border: "4px solid #5a3a1a",
          background:
            "linear-gradient(180deg, #b3813f 0%, #8a5f2c 55%, #6b4a2a 100%)",
          boxShadow:
            "0 16px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 230, 180, 0.25)",
          rotate: "-3deg",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 8,
            borderRadius: 3,
            border: "2px solid rgba(217, 176, 106, 0.35)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            top: 34,
            height: 2,
            background: "rgba(74, 48, 26, 0.28)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            top: 82,
            height: 2,
            background: "rgba(74, 48, 26, 0.22)",
          }}
        />
        {[
          { left: 10, top: 10 },
          { right: 10, top: 10 },
          { left: 10, bottom: 10 },
          { right: 10, bottom: 10 },
        ].map((pos, index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              ...pos,
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#3a2410",
              border: "1px solid #241608",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          />
        ))}
        <div
          style={{
            fontFamily: pixelFont,
            fontSize: 19,
            lineHeight: 1.55,
            color: "#2a1a08",
            textAlign: "center",
            letterSpacing: 1,
            textShadow: "0 2px 0 rgba(255, 255, 255, 0.12)",
            paddingTop: 6,
          }}
        >
          ENTERTAINING
          <br />
          CHALLENGES
        </div>
      </div>
    </div>
  );
};
