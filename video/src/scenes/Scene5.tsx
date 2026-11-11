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
} from "../components/ui";
import { WorldOrb } from "../components/WorldOrb";
import { Halo, Neko } from "../components/Neko";

const SUBMISSIONS = [
  { name: "sum_answer", flipped: false },
  { name: "mirror_answer", flipped: false },
  { name: "list_answer", flipped: true },
  { name: "unique_values", flipped: false },
  { name: "text_window", flipped: true },
  { name: "median_answer", flipped: false },
];

const ROWS = [
  { name: "anonymous", before: 1450, after: 1450 },
  { name: "neko_fan99", before: 1250, after: 1250 },
  { name: "segfault_sensei", before: 980, after: 0 },
  { name: "null_pointer", before: 720, after: 720 },
];

export const Scene5: React.FC<{ lang: Lang; duration: number }> = ({ lang }) => {
  const c = COPY[lang].s5;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, vertical, pad, gap } = useLayout();

  const scanning = frame >= 250 && frame < 340;
  const rechecked = frame >= 300;
  const sweep = frame * 4;

  const beforeOrder = ["anonymous", "neko_fan99", "segfault_sensei", "null_pointer"];
  const afterOrder = ["anonymous", "neko_fan99", "null_pointer", "segfault_sensei"];
  const rowHeight = 82 * u;
  const rowGap = 8 * u;

  const orbStage = (
    <div style={{ position: "relative", flex: 1, minHeight: vertical ? 620 * u : 0 }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <WorldOrb
          size={(vertical ? 380 : 340) * u}
          label="WORLD"
          accent={COLORS.cyan}
          active={1}
          seeds={["ok", "!", "x", "{}", "77", "∑"]}
        />
        <div
          style={{
            position: "absolute",
            inset: -180 * u,
            borderRadius: "50%",
            background: `conic-gradient(from ${sweep}deg, ${COLORS.cyan}33, transparent 26%, transparent 100%)`,
            maskImage: "radial-gradient(circle, transparent 40%, black 41%, black 100%)",
            opacity: scanning ? 0.9 : 0.2,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: -22 * u,
            borderRadius: "50%",
            border: `${1.5 * u}px solid ${scanning ? COLORS.amber : COLORS.cyan}55`,
            boxShadow: scanning ? glow(COLORS.amber, 0.4) : "none",
          }}
        />
      </div>

      {SUBMISSIONS.map((sub, i) => {
        const angle = (i / SUBMISSIONS.length) * Math.PI * 2 - Math.PI / 2;
        const radius = (vertical ? 310 : 280) * u;
        const failed = sub.flipped && rechecked;
        const color = failed ? COLORS.magenta : COLORS.cyan;
        const enter = spring({
          frame: frame - 40 - i * 4,
          fps,
          config: { damping: 16 },
        });
        return (
          <div
            key={sub.name}
            style={{
              position: "absolute",
              left: `calc(50% + ${Math.cos(angle) * radius}px)`,
              top: `calc(50% + ${Math.sin(angle) * radius * 0.82}px)`,
              transform: `translate(-50%, -50%) scale(${enter * (failed ? 1.04 : 1)})`,
              opacity: enter,
              border: `${1.5 * u}px solid ${color}66`,
              background: `${COLORS.bg1}e6`,
              padding: `${6 * u}px ${10 * u}px`,
              fontFamily: FONTS.mono,
              fontWeight: 700,
              fontSize: 13.5 * u,
              color,
              boxShadow: failed ? glow(COLORS.magenta, 0.5) : "none",
              whiteSpace: "nowrap",
            }}
          >
            {sub.name}
            <span style={{ marginLeft: 8 * u, color: COLORS.dim }}>
              {failed ? "FAIL" : "PASS"}
            </span>
          </div>
        );
      })}

      {[0, 1, 2].map((i) => {
        const angle = frame / 34 + (i / 3) * Math.PI * 2;
        const radius = (vertical ? 440 : 460) * u;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.5;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
              display: "flex",
              alignItems: "center",
              gap: 6 * u,
              padding: `${4 * u}px ${8 * u}px`,
              border: `${1 * u}px solid ${COLORS.amber}66`,
              background: `${COLORS.bg0}dd`,
              color: COLORS.amber,
              fontFamily: FONTS.mono,
              fontSize: 11 * u,
              letterSpacing: 0.5 * u,
              boxShadow: glow(COLORS.amber, 0.3),
              opacity: interpolate(frame, [20 + i * 8, 40 + i * 8], [0, 1], clamp),
            }}
          >
            <span
              style={{
                width: 8 * u,
                height: 8 * u,
                background: scanning ? COLORS.amber : COLORS.cyan,
                boxShadow: `0 0 ${6 * u}px ${scanning ? COLORS.amber : COLORS.cyan}`,
              }}
            />
            {c.worker}-0{i + 1}
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: vertical ? 0 : 4 * u,
          bottom: vertical ? -40 * u : -24 * u,
          zIndex: 4,
        }}
      >
        <div style={{ position: "relative" }}>
          <Halo size={120 * u} y={-30 * u} />
          <Neko
            mood="admin"
            size={(vertical ? 150 : 172) * u}
            seed={5}
            blink={false}
          />
        </div>
      </div>
    </div>
  );

  const leaderboard = (
    <div
      style={{
        width: vertical ? "100%" : "38%",
        display: "flex",
        flexDirection: "column",
        gap: 10 * u,
        justifyContent: "center",
        marginBottom: vertical ? 90 * u : 0,
      }}
    >
      <NeonPanel accent={COLORS.cyan} glowAmount={0.6} style={{ height: "auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12 * u,
          }}
        >
          <PixelLabel blink={false} color={COLORS.cyan} size={10}>
            LIVE RANKING
          </PixelLabel>
          <Chip
            size={11}
            accent={rechecked ? COLORS.cyan : COLORS.amber}
            filled
          >
            {rechecked ? "updated" : "rechecking"}
          </Chip>
        </div>
        <div
          style={{
            position: "relative",
            height: ROWS.length * (rowHeight + rowGap),
          }}
        >
          {ROWS.map((row) => {
            const fromIndex = beforeOrder.indexOf(row.name);
            const toIndex = afterOrder.indexOf(row.name);
            const move = interpolate(frame, [300, 352], [0, 1], clamp);
            const pos = fromIndex + (toIndex - fromIndex) * move;
            const score = Math.round(
              interpolate(frame, [300, 340], [row.before, row.after], clamp),
            );
            const isDown = row.after < row.before && rechecked;
            return (
              <div
                key={row.name}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: pos * (rowHeight + rowGap),
                  height: rowHeight,
                  display: "flex",
                  alignItems: "center",
                  gap: 10 * u,
                  padding: `${8 * u}px ${12 * u}px`,
                  background: `${COLORS.bg0}aa`,
                  border: `${1 * u}px solid ${isDown ? COLORS.magenta : COLORS.line}`,
                  opacity: 1 - Math.sin(move * Math.PI) * 0.06,
                }}
              >
                <span
                  style={{
                    color: COLORS.muted,
                    fontFamily: FONTS.pixel,
                    fontSize: 12 * u,
                    width: 26 * u,
                  }}
                >
                  #{Math.round(pos) + 1}
                </span>
                <span
                  style={{
                    flex: 1,
                    color: row.name === "anonymous" ? COLORS.amber : COLORS.text,
                    fontFamily: FONTS.mono,
                    fontWeight: 700,
                    fontSize: 17 * u,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}
                >
                  {row.name}
                </span>
                <span
                  style={{
                    color: isDown ? COLORS.magenta : COLORS.cyan,
                    fontFamily: FONTS.mono,
                    fontWeight: 800,
                    fontSize: 19 * u,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {score}
                </span>
              </div>
            );
          })}
        </div>
      </NeonPanel>
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
        }}
      >
        {orbStage}
        {leaderboard}
      </div>

      <Caption
        lines={[
          { text: c.captions[0], from: 20, to: 250 },
          { text: c.captions[1], from: 280, to: 478 },
        ]}
      />
    </AbsoluteFill>
  );
};
