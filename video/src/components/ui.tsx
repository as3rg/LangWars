import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONTS, clamp, glow } from "../lib/theme";
import { useLayout } from "../lib/layout";

export const PixelLabel: React.FC<{
  children: React.ReactNode;
  color?: string;
  size?: number;
  blink?: boolean;
}> = ({ children, color = COLORS.amber, size = 15, blink = true }) => {
  const { u } = useLayout();
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12 * u,
        fontFamily: FONTS.pixel,
        fontSize: size * u,
        lineHeight: 1.5,
        letterSpacing: 1 * u,
        color,
        textShadow: `0 0 ${12 * u}px ${color}66`,
      }}
    >
      {blink && (
        <span
          style={{
            width: 12 * u,
            height: 12 * u,
            background: color,
            boxShadow: glow(color, 0.6),
            opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0.25,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </div>
  );
};

export const KineticHeadline: React.FC<{
  text: string;
  size?: number;
  color?: string;
  delay?: number;
  maxWidth?: string;
}> = ({ text, size = 96, color = COLORS.text, delay = 0, maxWidth }) => {
  const { u, vertical } = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        columnGap: size * 0.24 * u,
        rowGap: size * 0.06 * u,
        maxWidth: maxWidth ?? (vertical ? "100%" : "12em"),
        fontFamily: FONTS.display,
        fontWeight: 700,
        fontSize: size * u,
        lineHeight: 0.98,
        letterSpacing: -size * 0.012 * u,
        color,
        textTransform: "uppercase",
      }}
    >
      {words.map((word, i) => {
        const local = frame - delay - i * 3;
        const enter = spring({
          frame: local,
          fps,
          config: { damping: 16, stiffness: 160, mass: 0.6 },
        });
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              opacity: enter,
              transform: `translateY(${(1 - enter) * 46}px) rotate(${(1 - enter) * 3}deg)`,
              textShadow:
                i % 3 === 1
                  ? `0 0 ${26 * u}px ${COLORS.violet}66, 0 0 ${2 * u}px ${color}`
                  : `0 0 ${2 * u}px ${color}88`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

export const NeonPanel: React.FC<{
  children: React.ReactNode;
  accent?: string;
  style?: React.CSSProperties;
  padding?: number;
  corner?: number;
  glowAmount?: number;
}> = ({
  children,
  accent = COLORS.cyan,
  style,
  padding = 22,
  corner = 16,
  glowAmount = 0.5,
}) => {
  const { u } = useLayout();
  return (
    <div
      style={{
        position: "relative",
        background: `linear-gradient(160deg, ${COLORS.bg2}f2, ${COLORS.bg1}f2)`,
        border: `${1.5 * u}px solid ${accent}55`,
        boxShadow: `0 0 ${28 * u * glowAmount}px ${accent}22, inset 0 0 ${30 * u}px ${accent}0d`,
        clipPath: `polygon(0 0, calc(100% - ${corner * u}px) 0, 100% ${corner * u}px, 100% 100%, ${corner * u}px 100%, 0 calc(100% - ${corner * u}px))`,
        padding: padding * u,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Chip: React.FC<{
  children: React.ReactNode;
  accent?: string;
  size?: number;
  filled?: boolean;
}> = ({ children, accent = COLORS.cyan, size = 20, filled = false }) => {
  const { u } = useLayout();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8 * u,
        padding: `${6 * u}px ${12 * u}px`,
        border: `${1.5 * u}px solid ${accent}77`,
        background: filled ? `${accent}22` : "transparent",
        color: filled ? accent : accent,
        fontFamily: FONTS.mono,
        fontSize: size * u,
        fontWeight: 700,
        letterSpacing: 1 * u,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
};

export const Stamp: React.FC<{
  children: React.ReactNode;
  color?: string;
  size?: number;
  rotate?: number;
  scale?: number;
}> = ({ children, color = COLORS.magenta, size = 46, rotate = -8, scale = 1 }) => {
  const { u } = useLayout();
  return (
    <div
      style={{
        display: "inline-block",
        padding: `${10 * u}px ${22 * u}px`,
        border: `${4 * u}px solid ${color}`,
        color,
        fontFamily: FONTS.pixel,
        fontSize: size * u,
        letterSpacing: 1 * u,
        textShadow: `0 0 ${18 * u}px ${color}aa`,
        boxShadow: `0 0 ${26 * u}px ${color}55, inset 0 0 ${22 * u}px ${color}22`,
        transform: `rotate(${rotate}deg) scale(${scale})`,
        background: `${COLORS.bg0}aa`,
      }}
    >
      {children}
    </div>
  );
};

export const Caption: React.FC<{
  lines: { text: string; from: number; to: number }[];
}> = ({ lines }) => {
  const { vertical, u, pad } = useLayout();
  const frame = useCurrentFrame();
  const active = lines.find((l) => frame >= l.from && frame < l.to);
  if (!active) {
    return null;
  }
  const local = frame - active.from;
  const enter = interpolate(local, [0, 8], [0, 1], clamp);
  const exit = interpolate(frame, [active.to - 8, active.to], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: vertical ? 30 : pad * 0.62,
        display: "flex",
        justifyContent: "center",
        padding: `0 ${pad}px`,
        opacity: enter * exit,
        transform: `translateY(${(1 - enter) * 14}px)`,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: vertical ? "94%" : "74%",
          textAlign: "center",
          padding: `${10 * u}px ${24 * u}px`,
          background: `${COLORS.bg0}d9`,
          border: `${1 * u}px solid ${COLORS.cyan}44`,
          boxShadow: `0 0 ${24 * u}px ${COLORS.cyan}22`,
          color: COLORS.text,
          fontFamily: FONTS.mono,
          fontWeight: 700,
          fontSize: (vertical ? 30 : 33) * u,
          lineHeight: 1.35,
        }}
      >
        {active.text}
      </div>
    </div>
  );
};

export const SpeechBubble: React.FC<{
  children: React.ReactNode;
  visible: number;
  accent?: string;
  side?: "left" | "right";
}> = ({ children, visible, accent = COLORS.cyan, side = "left" }) => {
  const { u } = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: visible, fps, config: { damping: 13 } });
  return (
    <div
      style={{
        opacity: enter * Math.min(1, frame / 2),
        transform: `scale(${0.7 + enter * 0.3})`,
        transformOrigin: side === "left" ? "0% 100%" : "100% 100%",
        background: COLORS.bg2,
        border: `${2 * u}px solid ${accent}`,
        boxShadow: glow(accent, 0.5),
        color: accent,
        fontFamily: FONTS.mono,
        fontWeight: 800,
        fontSize: 25 * u,
        padding: `${10 * u}px ${16 * u}px`,
        maxWidth: 330 * u,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
};

export const ProgressBar: React.FC<{
  progress: number;
  accent?: string;
  height?: number;
}> = ({ progress, accent = COLORS.cyan, height = 8 }) => {
  const { u } = useLayout();
  return (
    <div
      style={{
        width: "100%",
        height: height * u,
        background: `${accent}1a`,
        border: `${1 * u}px solid ${accent}33`,
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
          height: "100%",
          background: accent,
          boxShadow: `0 0 ${12 * u}px ${accent}`,
        }}
      />
    </div>
  );
};

export const ScoreCounter: React.FC<{
  value: number;
  size?: number;
  color?: string;
}> = ({ value, size = 92, color = COLORS.cyan }) => {
  const { u } = useLayout();
  return (
    <div
      style={{
        fontFamily: FONTS.display,
        fontWeight: 700,
        fontSize: size * u,
        lineHeight: 1,
        color,
        textShadow: `0 0 ${30 * u}px ${color}66`,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: -1 * u,
      }}
    >
      {Math.round(value).toLocaleString("en-US").replace(/,/g, " ")}
    </div>
  );
};
