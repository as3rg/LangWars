import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { displayFont, monoFont } from "../fonts";
import { COLORS } from "../theme";
import { CatMascot } from "./LangWarsSite";

export const FinalScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reveal = spring({
    frame: frame - 30,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });
  const revealOpacity = interpolate(frame, [30, 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulse = interpolate(frame, [30, 34, 48], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorOn = Math.floor(frame / (fps / 2)) % 2 === 0;
  const bob = Math.sin(frame * 0.08) * 5;
  const tilt = Math.sin(frame * 0.05) * 1.5;
  const dotOn = Math.floor(frame / (fps / 2)) % 2 === 0;

  return (
    <AbsoluteFill
      style={{ backgroundColor: "#050510", overflow: "hidden" }}
    >
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(900px 600px at 50% 38%, rgba(15,241,202,0.12), transparent 60%), radial-gradient(800px 700px at 50% 100%, rgba(138,92,246,0.12), transparent 65%), radial-gradient(600px 500px at 15% 85%, rgba(255,46,136,0.06), transparent 70%), #050510",
        }}
      />

      {frame < 30 ? (
        <AbsoluteFill style={{ display: "grid", placeItems: "center" }}>
          <div
            style={{
              fontFamily: monoFont,
              fontSize: 56,
              color: COLORS.green,
              opacity: cursorOn ? 1 : 0.15,
              textShadow: "0 0 24px rgba(63,185,80,0.5)",
            }}
          >
            _
          </div>
        </AbsoluteFill>
      ) : null}

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "42%",
          width: 520,
          height: 520,
          translate: "-50% -50%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(15,241,202,0.24), rgba(138,92,246,0.12) 42%, transparent 70%)",
          opacity: pulse,
          scale: 0.8 + pulse * 0.5,
          filter: "blur(8px)",
        }}
      />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: revealOpacity,
          translate: `0px ${(1 - Math.min(1, reveal)) * 24}px`,
          scale: 0.92 + Math.min(1, reveal) * 0.08,
        }}
      >
        <div
          style={{
            translate: `0px ${bob}px`,
            rotate: `${tilt}deg`,
            transformOrigin: "50% 80%",
          }}
        >
          <CatMascot size={240} />
        </div>
        <div
          style={{
            marginTop: 20,
            fontFamily: displayFont,
            fontSize: 154,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -6,
            lineHeight: 1,
            textShadow: `0 0 ${
              20 + Math.sin(frame * 0.09) * 9
            }px rgba(15,241,202,0.20)`,
          }}
        >
          LWLang
        </div>
        <div
          style={{
            marginTop: 10,
            width: 180,
            height: 5,
            borderRadius: 3,
            background:
              "linear-gradient(90deg, #0ff1ca, #8a5cf6 55%, #ff2e88)",
            boxShadow: "0 0 24px rgba(15,241,202,0.35)",
          }}
        />
        <div
          style={{
            marginTop: 18,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: monoFont,
            fontSize: 20,
            letterSpacing: 4,
            color: COLORS.muted,
          }}
        >
          THE LANGUAGE
          <span
            style={{
              width: 8,
              height: 16,
              background: COLORS.green,
              opacity: dotOn ? 1 : 0.15,
            }}
          />
        </div>
      </AbsoluteFill>


    </AbsoluteFill>
  );
};
