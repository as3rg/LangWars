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
import {
  Caption,
  Chip,
  KineticHeadline,
  NeonPanel,
  PixelLabel,
} from "../components/ui";
import { WorldOrb } from "../components/WorldOrb";
import { Halo, Neko } from "../components/Neko";

type CardSpec = {
  name: string;
  code: string;
  accent: string;
  x: number;
  y: number;
  delay: number;
};

const CARD_SPECS: CardSpec[] = [
  { name: "neko_fan99", code: "sum_answer = left + right", accent: COLORS.cyan, x: 16, y: 15, delay: 58 },
  { name: "null_pointer", code: "mirror_answer = reverse(text)", accent: COLORS.violet, x: 15, y: 74, delay: 76 },
  { name: "segfault_sensei", code: "items = [4, 8, 15]", accent: COLORS.amber, x: 84, y: 40, delay: 94 },
];

const VERTICAL_POS: Record<string, { x: number; y: number }> = {
  neko_fan99: { x: 20, y: 8 },
  null_pointer: { x: 50, y: 8 },
  segfault_sensei: { x: 80, y: 8 },
};

export const Scene2: React.FC<{ lang: Lang; duration: number }> = ({ lang }) => {
  const c = COPY[lang].s2;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, vertical, pad, gap } = useLayout();

  const orbActive = spring({
    frame: frame - 18,
    fps,
    config: { damping: 18, stiffness: 90 },
  });

  const rename = frame >= 165;
  const renameShake =
    rename && frame < 185
      ? Math.sin(frame * 3.2) * 7 * (1 - (frame - 165) / 20)
      : 0;

  const names = [
    { label: "sum_answer", accent: COLORS.cyan },
    { label: rename ? "lef7" : "left", accent: rename ? COLORS.magenta : COLORS.cyan },
    { label: "right", accent: COLORS.cyan },
    { label: "items", accent: COLORS.amber },
    { label: "mirror_answer", accent: COLORS.violet },
  ];

  const orbSize = (vertical ? 560 : 430) * u;
  const cardWidth = (vertical ? 250 : 264) * u;

  const cardCenter = (spec: CardSpec) => {
    if (vertical) {
      return VERTICAL_POS[spec.name];
    }
    return { x: spec.x, y: spec.y };
  };

  return (
    <AbsoluteFill
      style={{
        padding: pad,
        display: "flex",
        flexDirection: "column",
        gap: gap * 0.6,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          alignItems: vertical ? "flex-start" : "flex-end",
          justifyContent: "space-between",
          gap: 14 * u,
          zIndex: 3,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 * u }}>
          <PixelLabel size={13}>{c.label}</PixelLabel>
          <KineticHeadline text={c.headline} size={vertical ? 60 : 82} delay={2} />
        </div>
        <div
          style={{
            color: COLORS.muted,
            fontFamily: FONTS.mono,
            fontSize: (vertical ? 26 : 30) * u,
            maxWidth: vertical ? "100%" : "32%",
            textAlign: vertical ? "left" : "right",
            opacity: interpolate(frame, [40, 70], [0, 1], clamp),
          }}
        >
          {c.sub}
        </div>
      </div>

      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          {CARD_SPECS.map((spec) => {
            const pos = cardCenter(spec);
            const beam = interpolate(frame, [spec.delay + 8, spec.delay + 30], [0, 1], clamp);
            const orbY = vertical ? 54 : 50;
            return (
              <line
                key={spec.name}
                x1={pos.x}
                y1={pos.y + 6}
                x2={50}
                y2={orbY}
                stroke={spec.accent}
                strokeWidth={2}
                strokeOpacity={beam * 0.55}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: vertical ? "54%" : "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <WorldOrb
            size={orbSize}
            label={c.world}
            active={orbActive}
            seeds={["fn", "{}", "[]", "==", "++", "x", "a", "→"]}
          />
        </div>

        {CARD_SPECS.map((spec) => {
          const pos = cardCenter(spec);
          const enter = spring({
            frame: frame - spec.delay,
            fps,
            config: { damping: 15, stiffness: 130 },
          });
          return (
            <div
              key={spec.name}
              style={{
                position: "absolute",
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: cardWidth,
                transform: `translate(-50%, -50%) scale(${enter})`,
                opacity: enter,
                zIndex: 2,
              }}
            >
              <NeonPanel padding={13} accent={spec.accent} glowAmount={0.4}>
                <div
                  style={{
                    color: spec.accent,
                    fontFamily: FONTS.mono,
                    fontWeight: 800,
                    fontSize: 17 * u,
                    marginBottom: 6 * u,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {spec.name}
                </div>
                <div
                  style={{
                    color: COLORS.text,
                    fontFamily: FONTS.mono,
                    fontSize: 13.5 * u,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    opacity: 0.85,
                  }}
                >
                  {spec.code}
                </div>
                <div style={{ marginTop: 9 * u }}>
                  <Chip size={10} accent={spec.accent} filled>
                    published
                  </Chip>
                </div>
              </NeonPanel>
            </div>
          );
        })}

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: vertical ? "72%" : "83%",
            transform: `translate(-50%, 0) translateX(${renameShake}px)`,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 10 * u,
            width: vertical ? "94%" : "64%",
            opacity: interpolate(frame, [112, 140], [0, 1], clamp),
          }}
        >
          {names.map((name, i) => (
            <Chip
              key={i}
              size={vertical ? 15 : 16}
              accent={name.accent}
              filled={name.label === "lef7"}
            >
              {name.label}
            </Chip>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            right: vertical ? -6 * u : 2 * u,
            bottom: vertical ? 150 * u : -8 * u,
            zIndex: 4,
          }}
        >
          <div style={{ position: "relative" }}>
            {rename && <Halo size={150 * u} y={-40 * u} />}
            <Neko
              mood={rename ? "admin" : "idle"}
              size={(vertical ? 220 : 210) * u}
              seed={2}
              talking={frame >= 300 && frame < 330}
            />
          </div>
        </div>
      </div>

      <Caption
        lines={[
          { text: c.captions[0], from: 26, to: 196 },
          { text: c.captions[1], from: 216, to: 488 },
        ]}
      />
    </AbsoluteFill>
  );
};
