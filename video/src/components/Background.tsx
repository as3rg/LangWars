import React, { useMemo } from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";
import { useLayout } from "../lib/layout";
import { COLORS } from "../lib/theme";

type Star = {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
  hue: string;
};

const PALETTE = [COLORS.cyan, COLORS.violet, COLORS.magenta, COLORS.text];

export const Background: React.FC<{
  accent?: string;
  intensity?: number;
  grid?: boolean;
}> = ({ accent = COLORS.cyan, intensity = 1, grid = true }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { vertical } = useLayout();

  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: vertical ? 90 : 130 }, (_, i) => ({
        x: random(`sx-${i}`) * width,
        y: random(`sy-${i}`) * height,
        r: 0.8 + random(`sr-${i}`) * 2.2,
        speed: 0.15 + random(`sv-${i}`) * 0.55,
        phase: random(`sp-${i}`) * Math.PI * 2,
        hue: PALETTE[Math.floor(random(`sc-${i}`) * PALETTE.length)],
      })),
    [width, height, vertical],
  );

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(${width * 0.7}px ${height * 0.6}px at 12% -8%, ${COLORS.violet}26, transparent 62%),
            radial-gradient(${width * 0.6}px ${height * 0.5}px at 104% 8%, ${accent}1f, transparent 58%),
            radial-gradient(${width * 0.8}px ${height * 0.7}px at 48% 112%, ${COLORS.magenta}14, transparent 62%),
            ${COLORS.bg0}`,
        }}
      />

      {stars.map((star, i) => {
        const twinkle =
          0.35 + 0.65 * Math.abs(Math.sin(star.phase + frame * 0.035));
        const y = (star.y + frame * star.speed) % height;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: star.x,
              top: y,
              width: star.r * 2,
              height: star.r * 2,
              borderRadius: "50%",
              background: star.hue,
              opacity: twinkle * (0.25 + 0.5 * intensity),
              boxShadow: `0 0 ${star.r * 4}px ${star.hue}`,
            }}
          />
        );
      })}

      {grid && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            perspective: 900,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "-60%",
              right: "-60%",
              bottom: "-30%",
              height: "105%",
              transform: "rotateX(64deg)",
              transformOrigin: "bottom center",
              backgroundImage: `
                linear-gradient(to right, ${accent}22 1.5px, transparent 1.5px),
                linear-gradient(to bottom, ${accent}22 1.5px, transparent 1.5px)`,
              backgroundSize: `${86 * (vertical ? 0.8 : 1)}px ${86 * (vertical ? 0.8 : 1)}px`,
              backgroundPosition: `0 ${(frame * 0.55) % 86}px`,
              maskImage:
                "linear-gradient(to top, rgba(0,0,0,0.95) 5%, rgba(0,0,0,0.35) 55%, transparent 88%)",
              opacity: 0.85,
            }}
          />
        </div>
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 52%, #050510b8 100%)",
          boxShadow: "inset 0 0 220px 60px #050510",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 3px)",
          opacity: 0.55,
          mixBlendMode: "overlay",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: `${((frame * 0.9) % (height + 300)) - 150}px`,
          height: 90,
          background: `linear-gradient(to bottom, transparent, ${accent}12, transparent)`,
        }}
      />
    </div>
  );
};

export const GlitchCuts: React.FC<{ boundaries: number[] }> = ({
  boundaries,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const near = boundaries.find((b) => Math.abs(frame - b) <= 3);
  if (near === undefined) {
    return null;
  }
  const strength = 1 - Math.abs(frame - near) / 4;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        mixBlendMode: "screen",
        opacity: strength * 0.9,
        pointerEvents: "none",
      }}
    >
      {Array.from({ length: 7 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: random(`gc-y-${near}-${i}`) * height,
            left: random(`gc-x-${near}-${i}`) * width * 0.4,
            width: width * (0.2 + random(`gc-w-${near}-${i}`) * 0.8),
            height: 2 + random(`gc-h-${near}-${i}`) * 10,
            background:
              i % 2 ? COLORS.magenta : COLORS.cyan,
            transform: `translateX(${(random(`gc-o-${near}-${i}`) - 0.5) * 80}px)`,
          }}
        />
      ))}
    </div>
  );
};

export const FlashOverlay: React.FC<{
  color: string;
  opacity: number;
}> = ({ color, opacity }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: color,
      opacity,
      mixBlendMode: "screen",
      pointerEvents: "none",
    }}
  />
);
