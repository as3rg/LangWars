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
import {
  Caption,
  Chip,
  KineticHeadline,
  NeonPanel,
  PixelLabel,
} from "../components/ui";
import { Neko } from "../components/Neko";

const BOARD = [
  { name: "anonymous", score: 1450, accent: COLORS.amber, broken: false },
  { name: "neko_fan99", score: 1250, accent: COLORS.cyan, broken: false },
  { name: "segfault_sensei", score: 0, accent: COLORS.magenta, broken: true },
  { name: "null_pointer", score: 720, accent: COLORS.cyan, broken: false },
  { name: "404_cat", score: 660, accent: COLORS.violet, broken: false },
  { name: "tail_recursion", score: 540, accent: COLORS.cyan, broken: false },
  { name: "stack_overflow", score: 470, accent: COLORS.magenta, broken: true },
];

export const Scene6: React.FC<{ lang: Lang; duration: number }> = ({ lang }) => {
  const c = COPY[lang].s6;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, vertical, pad, gap } = useLayout();

  const inviteEnter = spring({
    frame: frame - 300,
    fps,
    config: { damping: 15, stiffness: 110 },
  });
  const maxScore = BOARD[0].score;

  const board = (
    <NeonPanel accent={COLORS.cyan} glowAmount={0.7} style={{ flex: vertical ? 0 : 1 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16 * u,
        }}
      >
        <PixelLabel blink={false} color={COLORS.cyan} size={11}>
          WORLD RANKING
        </PixelLabel>
        <Chip size={11} accent={COLORS.amber} filled>
          {c.scoreLabel} = {c.lives}
        </Chip>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 * u }}>
        {BOARD.map((row, i) => {
          const enter = spring({
            frame: frame - 40 - i * 8,
            fps,
            config: { damping: 17, stiffness: 120 },
          });
          const shown = Math.round(
            interpolate(frame, [90 + i * 6, 190 + i * 6], [0, row.score], clamp),
          );
          return (
            <div
              key={row.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14 * u,
                padding: `${10 * u}px ${12 * u}px`,
                background: row.broken ? `${COLORS.magenta}12` : `${COLORS.bg0}aa`,
                border: `${1 * u}px solid ${row.broken ? COLORS.magenta : COLORS.line}`,
                opacity: enter,
                transform: `translateX(${(1 - enter) * -40}px)`,
              }}
            >
              <span
                style={{
                  width: 34 * u,
                  color: i === 0 ? COLORS.amber : COLORS.muted,
                  fontFamily: FONTS.pixel,
                  fontSize: 13 * u,
                }}
              >
                #{i + 1}
              </span>
              <span
                style={{
                  width: 190 * u,
                  color: row.accent,
                  fontFamily: FONTS.mono,
                  fontWeight: 700,
                  fontSize: 18 * u,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {row.name}
              </span>
              <div style={{ flex: 1, position: "relative" }}>
                <div
                  style={{
                    height: 10 * u,
                    background: `${COLORS.line}`,
                    border: `${1 * u}px solid ${COLORS.lineSoft}`,
                  }}
                >
                  <div
                    style={{
                      width: `${(shown / maxScore) * 100}%`,
                      height: "100%",
                      background: row.broken ? COLORS.magenta : row.accent,
                      boxShadow: `0 0 ${10 * u}px ${row.broken ? COLORS.magenta : row.accent}aa`,
                    }}
                  />
                </div>
              </div>
              <span
                style={{
                  width: 74 * u,
                  textAlign: "right",
                  color: row.broken ? COLORS.magenta : COLORS.text,
                  fontFamily: FONTS.mono,
                  fontWeight: 800,
                  fontSize: 20 * u,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {shown}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 14 * u,
          color: COLORS.muted,
          fontFamily: FONTS.mono,
          fontSize: 15 * u,
          lineHeight: 1.4,
        }}
      >
        {c.captions[0]}
      </div>
    </NeonPanel>
  );

  const invite = (
    <div
      style={{
        width: vertical ? "100%" : 360 * u,
        display: "flex",
        flexDirection: "column",
        gap: gap,
        opacity: inviteEnter,
        transform: `translateY(${(1 - inviteEnter) * 50}px)`,
      }}
    >
      <NeonPanel accent={COLORS.violet} glowAmount={0.9} padding={20}>
        <PixelLabel blink={false} color={COLORS.violet} size={11}>
          {c.invite}
        </PixelLabel>
        <div
          style={{
            marginTop: 14 * u,
            fontFamily: FONTS.mono,
            fontWeight: 800,
            fontSize: 23 * u,
            color: COLORS.text,
            letterSpacing: 1 * u,
          }}
        >
          LW-9-LIVES-INVITE
        </div>
        <div
          style={{
            marginTop: 12 * u,
            display: "flex",
            gap: 3 * u,
            height: 54 * u,
            alignItems: "flex-end",
          }}
        >
          {Array.from({ length: 22 }, (_, i) => (
            <div
              key={i}
              style={{
                width: 4 * u,
                height: `${45 + random(`bar-${i}`) * 55}%`,
                background: i % 4 === 0 ? COLORS.cyan : COLORS.violet,
                opacity: 0.85,
              }}
            />
          ))}
        </div>
        <div
          style={{
            marginTop: 14 * u,
            color: COLORS.muted,
            fontFamily: FONTS.mono,
            fontSize: 16 * u,
            lineHeight: 1.4,
          }}
        >
          {c.inviteSub}
        </div>
      </NeonPanel>

      <div style={{ display: "flex", gap: 10 * u, alignItems: "center" }}>
        <Chip accent={COLORS.amber} size={15} filled>
          {c.lives}
        </Chip>
        <div
          style={{
            color: COLORS.muted,
            fontFamily: FONTS.mono,
            fontSize: 17 * u,
            lineHeight: 1.3,
          }}
        >
          {c.captions[1]}
        </div>
      </div>
    </div>
  );

  return (
    <AbsoluteFill
      style={{
        padding: pad,
        display: "flex",
        flexDirection: "column",
        gap: gap * 0.8,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 * u, zIndex: 3 }}>
        <PixelLabel size={13}>{c.label}</PixelLabel>
        <div
          style={{
            display: "flex",
            flexDirection: vertical ? "column" : "row",
            justifyContent: "space-between",
            alignItems: vertical ? "flex-start" : "flex-end",
            gap: 12 * u,
          }}
        >
          <KineticHeadline text={c.headline} size={vertical ? 58 : 82} delay={2} />
          <div
            style={{
              color: COLORS.muted,
              fontFamily: FONTS.mono,
              fontSize: (vertical ? 24 : 28) * u,
            }}
          >
            {c.sub}
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          gap,
          minHeight: 0,
          justifyContent: vertical ? "center" : "flex-start",
          alignItems: vertical ? "stretch" : "center",
        }}
      >
        {board}
        <div style={{ display: "flex", flexDirection: "column", gap, justifyContent: "center" }}>
          {invite}
          <div style={{ position: "relative", alignSelf: "flex-end", marginBottom: vertical ? 20 * u : 0 }}>
            <Neko
              mood={frame >= 450 ? "wink" : "happy"}
              size={(vertical ? 180 : 210) * u}
              seed={6}
            />
          </div>
        </div>
      </div>

      <Caption
        lines={[
          { text: c.captions[0], from: 20, to: 250 },
          { text: c.captions[1], from: 280, to: 538 },
        ]}
      />
    </AbsoluteFill>
  );
};
