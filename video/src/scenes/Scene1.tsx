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
import { COLORS, FONTS, clamp } from "../lib/theme";
import { KineticHeadline, PixelLabel, SpeechBubble, Stamp } from "../components/ui";
import { CodeWindow, TerminalTestRow } from "../components/CodeWindow";
import { Neko } from "../components/Neko";
import { Caption } from "../components/ui";

const CODE = [
  { text: "@solution" },
  { text: "function add(left, right) {" },
  { text: "  return left + right" },
  { text: "}" },
];

const CODE_LEN = CODE.map((l) => l.text).join("\n").length;

export const Scene1: React.FC<{ lang: Lang; duration: number }> = ({ lang }) => {
  const c = COPY[lang].s1;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, vertical, pad, gap } = useLayout();

  const typed = Math.floor(interpolate(frame, [22, 118], [0, CODE_LEN], clamp));
  const pass = frame >= 118;
  const fail = frame >= 152;
  const status = fail ? "fail" : pass ? "pass" : "idle";
  const shake =
    fail && frame < 174
      ? Math.sin(frame * 2.7) * 14 * (1 - (frame - 152) / 22)
      : 0;
  const flash = interpolate(frame, [152, 156, 176], [0, 0.26, 0], clamp);

  const stampEnter = spring({
    frame: frame - 154,
    fps,
    config: { damping: 9, stiffness: 220 },
  });

  const mood = frame >= 214 ? "sad" : fail ? "dead" : "idle";

  return (
    <AbsoluteFill
      style={{
        padding: pad,
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        gap: gap * 1.2,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: vertical ? "100%" : "43%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 18 * u,
          zIndex: 2,
        }}
      >
        <PixelLabel size={13}>{c.label}</PixelLabel>
        <KineticHeadline
          text={c.headline}
          size={vertical ? 62 : 86}
          delay={4}
        />
        <div
          style={{
            opacity: interpolate(frame, [220, 250], [0, 1], clamp),
            transform: `translateY(${interpolate(frame, [220, 250], [18, 0], clamp)}px)`,
            color: COLORS.magenta,
            fontFamily: FONTS.display,
            fontWeight: 600,
            fontSize: (vertical ? 34 : 40) * u,
            letterSpacing: 1 * u,
            textTransform: "lowercase",
          }}
        >
          {c.sub}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          alignItems: "center",
          justifyContent: vertical ? "flex-start" : "center",
          minHeight: vertical ? 0 : undefined,
          paddingTop: vertical ? 36 * u : 0,
        }}
      >
        <div
          style={{
            position: "relative",
            width: vertical ? "100%" : "94%",
            transform: `translateX(${shake}px)`,
          }}
        >
          <div style={{ position: "relative" }}>
            <CodeWindow
              title="warmup.lw"
              lines={CODE}
              typedChars={typed}
              status={status}
              fontSize={vertical ? 24 : 21}
              height={vertical ? 430 * u : 300 * u}
              style={{
                borderColor: fail ? COLORS.magenta : undefined,
              }}
            />
            {fail && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${stampEnter}) rotate(-9deg)`,
                  opacity: stampEnter,
                }}
              >
                <Stamp size={vertical ? 30 : 40}>{c.fail}</Stamp>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 14 * u,
              display: "flex",
              flexDirection: "column",
              gap: 8 * u,
            }}
          >
            <TerminalTestRow
              input="add(2, 3)"
              expected="5"
              state={frame >= 108 ? "pass" : "pending"}
              delay={104}
              size={vertical ? 20 : 17}
            />
            <TerminalTestRow
              input="add(1000000, 1)"
              expected="-999999"
              state={fail ? "fail" : "pending"}
              delay={138}
              size={vertical ? 20 : 17}
            />
          </div>

        </div>

        <div
          style={{
            position: "absolute",
            right: vertical ? -8 * u : -6 * u,
            bottom: vertical ? 150 * u : -34 * u,
            zIndex: 3,
          }}
        >
          <div style={{ position: "relative" }}>
            <Neko
              mood={mood}
              size={(vertical ? 250 : 232) * u}
              seed={1}
              talking={frame >= 300 && frame < 360}
            />
            <div style={{ position: "absolute", left: "38%", top: "-18%" }}>
              <SpeechBubble visible={frame - 300} accent={COLORS.magenta}>
                nya.
              </SpeechBubble>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: COLORS.magenta,
          opacity: flash,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      <Caption
        lines={[
          { text: c.captions[0], from: 18, to: 168 },
          { text: c.captions[1], from: 186, to: 380 },
        ]}
      />
    </AbsoluteFill>
  );
};
