import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Lang } from "../lib/script";
import { COPY } from "../lib/copy";
import { useLayout } from "../lib/layout";
import { COLORS, FONTS, clamp, glow } from "../lib/theme";
import {
  Caption,
  Chip,
  KineticHeadline,
  NeonPanel,
  PixelLabel,
  ProgressBar,
  ScoreCounter,
  SpeechBubble,
} from "../components/ui";
import { CodeWindow, TerminalTestRow } from "../components/CodeWindow";
import { Halo, Neko } from "../components/Neko";

export const Scene3: React.FC<{ lang: Lang; duration: number }> = ({ lang }) => {
  const c = COPY[lang].s3;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, vertical, pad, gap } = useLayout();

  const broken = frame >= 128;
  const score = Math.round(
    interpolate(frame, [230, 360], [250, 0], clamp),
  );
  const scoreShake = broken && frame < 150 ? Math.sin(frame * 3) * 9 : 0;

  const notifEnter = spring({
    frame: frame - 360,
    fps,
    config: { damping: 15, stiffness: 120 },
  });
  const notifVisible = frame >= 360 && frame < 486;

  const catMood = frame >= 132 ? "admin" : "idle";
  const bubbleVisible = frame - 496;

  const scaledCode = [
    { text: "@solution" },
    { text: "function add(left, right) {" },
    { text: "  return left + right" },
    { text: "}" },
  ];

  return (
    <AbsoluteFill
      style={{
        padding: pad,
        display: "flex",
        flexDirection: "column",
        gap: gap * 0.7,
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
            gap: 10 * u,
          }}
        >
          <KineticHeadline text={c.headline} size={vertical ? 62 : 88} delay={2} />
          <div
            style={{
              color: COLORS.muted,
              fontFamily: FONTS.mono,
              fontSize: (vertical ? 26 : 30) * u,
              opacity: interpolate(frame, [30, 60], [0, 1], clamp),
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
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            width: vertical ? "100%" : "42%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 12 * u,
            transform: `translateX(${scoreShake}px)`,
          }}
        >
          <CodeWindow
            title="your_solution.lw"
            lines={scaledCode}
            status={broken ? "fail" : "pass"}
            fontSize={vertical ? 22 : 19}
            height={vertical ? 320 * u : 260 * u}
            highlight={broken ? [1, 2] : []}
          />
          <TerminalTestRow
            input="add(2, 3)"
            expected="5"
            state={broken ? "fail" : "pass"}
            size={vertical ? 18 : 16}
          />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: vertical ? "row" : "column",
            alignItems: "center",
            justifyContent: "center",
            gap: gap,
          }}
        >
          <NeonPanel
            accent={score > 0 ? COLORS.cyan : COLORS.magenta}
            padding={vertical ? 20 : 24}
            style={{
              minWidth: vertical ? 0 : 300 * u,
              flex: vertical ? 1 : undefined,
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: COLORS.muted,
                fontFamily: FONTS.pixel,
                fontSize: 12 * u,
                letterSpacing: 2 * u,
                marginBottom: 8 * u,
              }}
            >
              {c.score}
            </div>
            <ScoreCounter
              value={score}
              size={vertical ? 64 : 80}
              color={score > 0 ? COLORS.cyan : COLORS.magenta}
            />
            <div style={{ marginTop: 14 * u }}>
              <ProgressBar
                progress={score / 250}
                accent={score > 0 ? COLORS.cyan : COLORS.magenta}
                height={7}
              />
            </div>
            {frame >= 240 && frame < 340 && (
              <div
                style={{
                  marginTop: 10 * u,
                  color: COLORS.magenta,
                  fontFamily: FONTS.mono,
                  fontWeight: 800,
                  fontSize: 22 * u,
                  opacity: interpolate(frame, [240, 250, 320, 340], [0, 1, 1, 0], clamp),
                }}
              >
                −250
              </div>
            )}
          </NeonPanel>

          <div style={{ position: "relative", flexShrink: 0 }}>
            {frame >= 132 && <Halo size={170 * u} y={-46 * u} />}
            <Neko
              mood={catMood}
              size={(vertical ? 230 : 250) * u}
              seed={3}
              talking={frame >= 496 && frame < 560}
            />
            {frame >= 140 &&
              [0, 1, 2, 3, 4].map((i) => {
                const t = frame - 140;
                const angle = (i / 5) * Math.PI * 2 + t / 40;
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "40%",
                      transform: `translate(-50%, -50%) translate(${Math.cos(angle) * 120 * u}px, ${Math.sin(angle) * 78 * u}px)`,
                      color: COLORS.amber,
                      fontFamily: FONTS.pixel,
                      fontSize: 26 * u,
                      opacity: 0.55 + Math.sin(t / 8 + i) * 0.3,
                      textShadow: glow(COLORS.amber, 0.4),
                    }}
                  >
                    ?
                  </div>
                );
              })}
            <div
              style={{
                position: "absolute",
                left: vertical ? "-20%" : "-6%",
                top: vertical ? "-12%" : "-22%",
                zIndex: 5,
              }}
            >
              <SpeechBubble visible={bubbleVisible} accent={COLORS.amber} side="left">
                {c.neko}
              </SpeechBubble>
            </div>
          </div>
        </div>
      </div>

      {notifVisible && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: vertical ? 240 * u : 150 * u,
            width: vertical ? "90%" : "58%",
            transform: `translate(-50%, ${(1 - notifEnter) * 80}px)`,
            opacity: notifEnter,
            zIndex: 6,
          }}
        >
          <NeonPanel
            accent={COLORS.magenta}
            glowAmount={1}
            style={{ display: "flex", gap: 18 * u, alignItems: "center" }}
          >
            <div
              style={{
                width: 54 * u,
                height: 54 * u,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `${2 * u}px solid ${COLORS.magenta}`,
                color: COLORS.magenta,
                fontFamily: FONTS.display,
                fontWeight: 700,
                fontSize: 34 * u,
                boxShadow: glow(COLORS.magenta, 0.4),
              }}
            >
              !
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: COLORS.text,
                  fontFamily: FONTS.display,
                  fontWeight: 700,
                  fontSize: (vertical ? 28 : 30) * u,
                }}
              >
                {c.notifTitle}
              </div>
              <div
                style={{
                  color: COLORS.muted,
                  fontFamily: FONTS.mono,
                  fontSize: (vertical ? 19 : 20) * u,
                  marginTop: 3 * u,
                }}
              >
                {c.notifBody}
              </div>
            </div>
            <Chip accent={COLORS.magenta} size={vertical ? 13 : 14} filled>
              anonymous
            </Chip>
          </NeonPanel>
        </div>
      )}

      <Caption
        lines={[
          { text: c.captions[0], from: 20, to: 210 },
          { text: c.captions[1], from: 240, to: 590 },
        ]}
      />
    </AbsoluteFill>
  );
};
