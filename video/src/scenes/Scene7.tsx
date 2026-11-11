import React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Lang } from "../lib/script";
import { COPY } from "../lib/copy";
import { useLayout } from "../lib/layout";
import { COLORS, FONTS, clamp } from "../lib/theme";
import { Chip, PixelLabel, SpeechBubble } from "../components/ui";
import { Neko } from "../components/Neko";

const CONFETTI = Array.from({ length: 42 }, (_, i) => ({
  x: random(`cx-${i}`) * 100,
  delay: random(`cd-${i}`) * 120,
  size: 5 + random(`cs-${i}`) * 10,
  speed: 0.7 + random(`cv-${i}`) * 1.8,
  color:
    i % 4 === 0
      ? COLORS.cyan
      : i % 4 === 1
        ? COLORS.magenta
        : i % 4 === 2
          ? COLORS.violet
          : COLORS.amber,
  rot: random(`cr-${i}`) * 360,
}));

export const Scene7: React.FC<{ lang: Lang; duration: number }> = ({
  lang,
  duration,
}) => {
  const c = COPY[lang].s7;
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const { u, vertical, pad } = useLayout();

  const logoEnter = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 110 },
  });
  const ctaEnter = spring({
    frame: frame - 90,
    fps,
    config: { damping: 12, stiffness: 130 },
  });
  const repoOpacity = interpolate(frame, [130, 160], [0, 1], clamp);
  const fadeOut = interpolate(frame, [duration - 14, duration - 1], [0, 1], clamp);
  const glitch = frame > 20 && frame < 60 ? Math.sin(frame * 1.7) * 6 : 0;
  const pulse = 1 + Math.sin(frame / 9) * 0.025;

  return (
    <AbsoluteFill
      style={{
        padding: pad,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22 * u,
        overflow: "hidden",
      }}
    >
      {CONFETTI.map((piece, i) => {
        const t = Math.max(0, frame - piece.delay);
        const top = (t * piece.speed * 4 + random(`cy-${i}`) * height) % (height + 120);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${piece.x}%`,
              top: top - 60,
              width: piece.size * u,
              height: piece.size * u,
              background: piece.color,
              opacity: 0.5,
              transform: `rotate(${piece.rot + frame * 2}deg)`,
              boxShadow: `0 0 ${piece.size}px ${piece.color}66`,
            }}
          />
        );
      })}

      <div style={{ opacity: logoEnter, transform: `scale(${0.9 + logoEnter * 0.1})` }}>
        <PixelLabel color={COLORS.amber} size={12}>
          {vertical ? "ONE SHARED WORLD" : "THE SHARED-STATE ARENA"}
        </PixelLabel>
      </div>

      <div
        style={{
          position: "relative",
          fontFamily: FONTS.display,
          fontWeight: 700,
          fontSize: (vertical ? 108 : 164) * u,
          lineHeight: 0.9,
          letterSpacing: -4 * u,
          color: COLORS.text,
          textShadow: `0 0 ${40 * u}px ${COLORS.cyan}55`,
          transform: `translateX(${glitch}px)`,
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            color: COLORS.magenta,
            transform: `translate(${glitch * -1.4 + 3}px, ${2 * u}px)`,
            opacity: 0.55,
            mixBlendMode: "screen",
          }}
        >
          {c.headline}
        </span>
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            color: COLORS.cyan,
            transform: `translate(${glitch * 1.2 - 3}px, ${-2 * u}px)`,
            opacity: 0.55,
            mixBlendMode: "screen",
          }}
        >
          {c.headline}
        </span>
        <span
          style={{
            WebkitTextStroke: `${1.5 * u}px ${COLORS.cyan}`,
            color: COLORS.bg0,
            filter: `drop-shadow(0 0 ${18 * u}px ${COLORS.cyan}88)`,
          }}
        >
          {c.headline}
        </span>
      </div>

      <div
        style={{
          color: COLORS.text,
          fontFamily: FONTS.display,
          fontWeight: 500,
          fontSize: (vertical ? 34 : 42) * u,
          letterSpacing: 2 * u,
          textAlign: "center",
          opacity: logoEnter,
        }}
      >
        {c.sub}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16 * u,
          marginTop: 6 * u,
          opacity: ctaEnter,
          transform: `scale(${ctaEnter * pulse})`,
        }}
      >
        <div
          style={{
            padding: `${16 * u}px ${28 * u}px`,
            border: `${3 * u}px solid ${COLORS.amber}`,
            color: COLORS.amber,
            fontFamily: FONTS.pixel,
            fontSize: (vertical ? 17 : 20) * u,
            letterSpacing: 1 * u,
            boxShadow: `0 0 ${30 * u}px ${COLORS.amber}44, inset 0 0 ${20 * u}px ${COLORS.amber}22`,
            textAlign: "center",
          }}
        >
          {c.cta}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14 * u,
          opacity: repoOpacity,
        }}
      >
        <Chip accent={COLORS.cyan} size={16} filled>
          {c.repo}
        </Chip>
        <Chip accent={COLORS.violet} size={16}>
          LWLang
        </Chip>
      </div>

      <div
        style={{
          position: "absolute",
          right: vertical ? "4%" : "6%",
          bottom: vertical ? "9%" : "8%",
          zIndex: 3,
        }}
      >
        <div style={{ position: "relative" }}>
          <Neko
            mood={frame >= 220 ? "wink" : "happy"}
            size={(vertical ? 300 : 360) * u}
            seed={7}
            talking={frame >= 244 && frame < 290}
            glowAmount={1.4}
          />
          <div
            style={{
              position: "absolute",
              right: "70%",
              top: "-34%",
              zIndex: 6,
            }}
          >
            <SpeechBubble visible={frame - 244} accent={COLORS.cyan} side="right">
              {c.neko}
            </SpeechBubble>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: COLORS.bg0,
          opacity: fadeOut,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 78% 82%, ${COLORS.cyan}0f, transparent 45%)`,
        }}
      />
    </AbsoluteFill>
  );
};
