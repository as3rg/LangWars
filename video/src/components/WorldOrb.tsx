import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS, FONTS, glow } from "../lib/theme";
import { useLayout } from "../lib/layout";

export const WorldOrb: React.FC<{
  size: number;
  label: string;
  accent?: string;
  active?: number;
  seeds?: string[];
}> = ({ size, label, accent = COLORS.cyan, active = 1, seeds = [] }) => {
  const frame = useCurrentFrame();
  const { u } = useLayout();
  const pulse = 0.9 + Math.sin(frame / 14) * 0.06;
  const spin = frame * 0.5;

  const glyphs = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2 + frame / 90;
    const radius = size * (0.3 + (i % 3) * 0.06);
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.72,
      ch: seeds[i % Math.max(1, seeds.length)] ?? "{}",
      o: 0.25 + ((i * 7) % 10) / 16,
    };
  });

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${pulse * (0.75 + active * 0.25)})`,
        opacity: 0.4 + active * 0.6,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -size * 0.18,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}2e 0%, ${accent}12 42%, transparent 68%)`,
          filter: "blur(6px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `${2 * u}px solid ${accent}55`,
          transform: `rotate(${spin}deg)`,
          backgroundImage: `repeating-conic-gradient(${accent}22 0deg 6deg, transparent 6deg 26deg)`,
          maskImage: "radial-gradient(circle, transparent 55%, black 56%, black 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: size * 0.1,
          borderRadius: "50%",
          border: `${1.5 * u}px solid ${COLORS.violet}55`,
          transform: `rotate(${-spin * 1.4}deg)`,
          borderStyle: "dashed",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: size * 0.19,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, ${COLORS.bg3}, ${COLORS.bg0} 72%)`,
          border: `${2 * u}px solid ${accent}88`,
          boxShadow: `inset 0 0 ${size * 0.16}px ${accent}33, ${glow(accent, 1.4)}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(to right, ${accent}14 1px, transparent 1px),
              linear-gradient(to bottom, ${accent}14 1px, transparent 1px)`,
            backgroundSize: `${size * 0.09}px ${size * 0.09}px`,
          }}
        />
        {glyphs.map((glyph, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) translate(${glyph.x}px, ${glyph.y}px)`,
              color: i % 3 === 0 ? COLORS.violet : accent,
              opacity: glyph.o * active,
              fontFamily: FONTS.mono,
              fontSize: size * 0.052,
              fontWeight: 700,
            }}
          >
            {glyph.ch}
          </span>
        ))}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            color: COLORS.text,
            fontFamily: FONTS.pixel,
            fontSize: size * 0.062,
            letterSpacing: size * 0.008,
            textAlign: "center",
            textShadow: `0 0 ${size * 0.05}px ${accent}`,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
};
