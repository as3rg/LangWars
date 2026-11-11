import React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Lang } from "../lib/script";
import { COPY } from "../lib/copy";
import { useLayout } from "../lib/layout";
import { COLORS, FONTS, glow } from "../lib/theme";
import {
  Caption,
  KineticHeadline,
  NeonPanel,
  PixelLabel,
  SpeechBubble,
} from "../components/ui";
import { Neko } from "../components/Neko";

const QuirkCard: React.FC<{
  title: string;
  accent: string;
  delay: number;
  children: React.ReactNode;
}> = ({ title, accent, delay, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 16, stiffness: 120 },
  });
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 70}px) scale(${0.96 + enter * 0.04})`,
      }}
    >
      <NeonPanel
        accent={accent}
        glowAmount={0.7}
        padding={18}
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 14 * u,
        }}
      >
        <PixelLabel blink={false} color={accent} size={11}>
          {title}
        </PixelLabel>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 12 * u,
          }}
        >
          {children}
        </div>
      </NeonPanel>
    </div>
  );
};

export const Scene4: React.FC<{ lang: Lang; duration: number }> = ({ lang }) => {
  const c = COPY[lang].s4;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, vertical, pad, gap } = useLayout();

  const flipped = frame >= 168;
  const wrapShake =
    frame >= 168 && frame < 190 ? Math.sin(frame * 2.4) * 6 : 0;

  const step = Math.floor(Math.max(0, frame - 330) / 26) % 5;
  const cycleActive = [0, 1, 2, 0, 1][step];
  const cycleDone = frame >= 452;

  const reversed = frame >= 540;
  const reverseFlip = spring({
    frame: frame - 540,
    fps,
    config: { damping: 12 },
  });

  const catSize = (vertical ? 160 : 210) * u;

  const cards = (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        gap: gap,
        minHeight: 0,
      }}
    >
      <QuirkCard title={c.wrap} accent={COLORS.amber} delay={vertical ? 30 : 40}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontWeight: 800,
            fontSize: (vertical ? 40 : 46) * u,
            color: COLORS.text,
            whiteSpace: "nowrap",
            transform: `translateX(${wrapShake}px)`,
          }}
        >
          1 000 000 <span style={{ color: COLORS.muted }}>+</span> 1{" "}
          <span style={{ color: COLORS.muted }}>=</span>
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontWeight: 800,
            fontSize: (vertical ? 48 : 58) * u,
            color: flipped ? COLORS.magenta : COLORS.cyan,
            textShadow: glow(flipped ? COLORS.magenta : COLORS.cyan, 0.6),
            transform: `scale(${flipped ? 1 + (1 - reverseFlip) * 0.06 : 1})`,
          }}
        >
          {flipped ? "−999 999" : "1 000 001"}
        </div>
        <div
          style={{
            color: COLORS.muted,
            fontFamily: FONTS.mono,
            fontSize: 17 * u,
          }}
        >
          ±1 000 000
        </div>
      </QuirkCard>

      <QuirkCard title={c.cycle} accent={COLORS.violet} delay={vertical ? 50 : 150}>
        <div style={{ display: "flex", gap: 10 * u, alignItems: "flex-end" }}>
          {[4, 8, 15].map((value, i) => {
            const hot = frame >= 330 && cycleActive === i && !cycleDone;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: `${12 * u}px ${4 * u}px`,
                  border: `${2 * u}px solid ${hot ? COLORS.cyan : COLORS.violet}88`,
                  background: hot ? `${COLORS.cyan}22` : `${COLORS.violet}0d`,
                  color: hot ? COLORS.cyan : COLORS.text,
                  fontFamily: FONTS.mono,
                  fontWeight: 800,
                  fontSize: (vertical ? 34 : 38) * u,
                  boxShadow: hot ? glow(COLORS.cyan, 0.4) : "none",
                  transform: hot ? "translateY(-6px)" : "none",
                }}
              >
                {value}
                <div
                  style={{
                    fontFamily: FONTS.mono,
                    fontWeight: 400,
                    fontSize: 13 * u,
                    color: COLORS.muted,
                    marginTop: 4 * u,
                  }}
                >
                  [{i}]
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontWeight: 700,
            fontSize: (vertical ? 24 : 27) * u,
            color: cycleDone ? COLORS.cyan : COLORS.muted,
          }}
        >
          items[4] = {cycleDone ? "8" : "…"}
        </div>
        <div
          style={{
            color: COLORS.muted,
            fontFamily: FONTS.mono,
            fontSize: 16 * u,
          }}
        >
          {c.cycleSub}
        </div>
      </QuirkCard>

      <QuirkCard title={c.unicode} accent={COLORS.cyan} delay={vertical ? 70 : 330}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10 * u,
            fontFamily: FONTS.mono,
            fontWeight: 800,
            fontSize: (vertical ? 40 : 46) * u,
          }}
        >
          <span style={{ color: COLORS.text }}>"🙂ab"</span>
          <span style={{ color: COLORS.muted, fontSize: 0.6 * (vertical ? 34 : 40) * u }}>
            ↓ reverse
          </span>
          <span
            style={{
              color: reversed ? COLORS.cyan : COLORS.dim,
              textShadow: reversed ? glow(COLORS.cyan, 0.6) : "none",
              transform: reversed
                ? `scaleX(${0.85 + reverseFlip * 0.15})`
                : "scaleX(0.9)",
              opacity: reversed ? 1 : 0.45,
            }}
          >
            "ba🙂"
          </span>
        </div>
        <div style={{ color: COLORS.muted, fontFamily: FONTS.mono, fontSize: 16 * u }}>
          code points, not bytes
        </div>
      </QuirkCard>
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
              maxWidth: vertical ? "100%" : "32%",
              textAlign: vertical ? "left" : "right",
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
          gap: gap,
          minHeight: 0,
        }}
      >
        {cards}
        <div
          style={{
            width: vertical ? 0 : catSize * 1.08,
            position: "relative",
            flexShrink: 0,
            alignSelf: vertical ? "flex-end" : "center",
            height: vertical ? 0 : undefined,
          }}
        >
          <div
            style={{
              position: vertical ? "absolute" : "relative",
              right: vertical ? -12 * u : undefined,
              bottom: vertical ? 140 * u : undefined,
              zIndex: 5,
            }}
          >
            <div style={{ position: "relative" }}>
              <Neko
                mood={frame >= 633 ? "happy" : "idle"}
                size={catSize}
                seed={4}
                talking={frame >= 633 && frame < 690}
              />
              <div
                style={{
                  position: "absolute",
                  right: vertical ? "60%" : "70%",
                  top: "-18%",
                  zIndex: 6,
                }}
              >
                <SpeechBubble visible={frame - 633} accent={COLORS.cyan} side="right">
                  {c.neko}
                </SpeechBubble>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Caption
        lines={[
          { text: c.captions[0], from: 24, to: 300 },
          { text: c.captions[1], from: 320, to: 680 },
        ]}
      />
    </AbsoluteFill>
  );
};
