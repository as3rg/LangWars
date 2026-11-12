import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GUY, HomeStage } from "../components/Room";
import { SittingGuy } from "../components/SittingGuy";
import { Brand } from "../components/Stage";
import { displayFont, monoFont } from "../fonts";
import { COLORS } from "../theme";

const MOVE_FRAME = 28;

export const SceneRival: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const move = spring({
    frame: frame - MOVE_FRAME,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.8 },
  });

  const youY = interpolate(move, [0, 1], [0, 118], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rivalY = interpolate(move, [0, 1], [118, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const rivalRating = Math.round(
    interpolate(frame, [MOVE_FRAME, MOVE_FRAME + 18], [1828, 1852], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  const moved = move > 0.5;
  const shocked = frame >= 22;

  const toast = interpolate(frame, [6, 16, 46, 56], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ fontFamily: displayFont }}>
      <HomeStage glow="rgba(63, 185, 80, 0.20)">
        <div
          style={{
            position: "absolute",
            inset: 17,
            display: "flex",
            flexDirection: "column",
            background: COLORS.panel,
          }}
        >
          <div
            style={{
              height: 88,
              display: "flex",
              alignItems: "center",
              padding: "0 28px",
              borderBottom: `1px solid ${COLORS.borderSoft}`,
              background: COLORS.panelRaised,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 27,
                  fontWeight: 700,
                  color: COLORS.text,
                  letterSpacing: 0.4,
                }}
              >
                LEADERBOARD
              </div>
              <div
                style={{
                  marginTop: 3,
                  fontFamily: monoFont,
                  fontSize: 13,
                  color: COLORS.faint,
                  letterSpacing: 1.2,
                }}
              >
                WEEK 12 · GLOBAL RATING
              </div>
            </div>
            <div
              style={{
                marginLeft: "auto",
                fontFamily: monoFont,
                fontSize: 14,
                color: COLORS.muted,
              }}
            >
              2,481 PLAYERS
            </div>
          </div>

          <div style={{ position: "relative", flex: 1, padding: "24px 28px" }}>
            <ScreenRow
              y={youY}
              rank={moved ? 2 : 1}
              name="you"
              rating="1840"
              solved="112 solved"
              initials="Y"
              accent={COLORS.blue}
              highlighted={false}
              trend={moved ? "down" : "flat"}
            />
            <ScreenRow
              y={rivalY}
              rank={moved ? 1 : 2}
              name="null_ptr"
              rating={String(rivalRating)}
              solved="118 solved"
              initials="N"
              accent={COLORS.green}
              highlighted={moved}
              trend={moved ? "up" : "flat"}
              delta={interpolate(frame, [MOVE_FRAME, MOVE_FRAME + 32], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}
            />
            <ScreenRow
              y={236}
              rank={3}
              name="byte_me"
              rating="1780"
              solved="104 solved"
              initials="B"
              accent={COLORS.purple}
              highlighted={false}
              trend="flat"
            />
          </div>
        </div>
      </HomeStage>

      <div
        style={{
          position: "absolute",
          left: GUY.left,
          top: GUY.top,
          width: GUY.width,
          opacity: interpolate(frame, [0, 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: `${interpolate(frame, [22, 38], [0, -16], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          })}px ${
            interpolate(frame, [22, 38], [0, -6], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }px`,
          rotate: `${interpolate(frame, [22, 38], [0, -2.5], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}deg`,
        }}
      >
        <SittingGuy
          mood={shocked ? "shock" : "coding"}
          typing={!shocked}
          width={GUY.width}
        />
      </div>

      <Brand />

      <div
        style={{
          position: "absolute",
          left: 690,
          top: 58,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 20px",
          borderRadius: 999,
          border: `1px solid rgba(63, 185, 80, 0.45)`,
          background: "rgba(14, 25, 18, 0.94)",
          opacity: toast,
          translate: `0px ${interpolate(toast, [0, 1], [-22, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}px`,
          boxShadow: "0 18px 46px rgba(63, 185, 80, 0.18)",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: COLORS.green,
          }}
        />
        <span style={{ fontSize: 21, color: COLORS.text, fontWeight: 500 }}>
          null_ptr solved TWO SUM
        </span>
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 19,
            fontWeight: 700,
            color: COLORS.green,
          }}
        >
          +24
        </span>
      </div>
    </AbsoluteFill>
  );
};

type ScreenRowProps = {
  readonly y: number;
  readonly rank: number;
  readonly name: string;
  readonly rating: string;
  readonly solved: string;
  readonly initials: string;
  readonly accent: string;
  readonly highlighted: boolean;
  readonly trend: "up" | "down" | "flat";
  readonly delta?: number;
};

const ScreenRow: React.FC<ScreenRowProps> = ({
  y,
  rank,
  name,
  rating,
  solved,
  initials,
  accent,
  highlighted,
  trend,
  delta,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: 28,
        right: 28,
        top: 24 + y,
        height: 106,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "0 22px",
        borderRadius: 16,
        border: `1px solid ${
          highlighted ? "rgba(63, 185, 80, 0.55)" : COLORS.borderSoft
        }`,
        background: highlighted
          ? "rgba(63, 185, 80, 0.10)"
          : "rgba(255, 255, 255, 0.025)",
        boxShadow: highlighted
          ? "0 0 44px rgba(63, 185, 80, 0.18)"
          : "none",
      }}
    >
      <div
        style={{
          width: 38,
          fontFamily: displayFont,
          fontSize: 26,
          fontWeight: 700,
          color: highlighted ? COLORS.green : COLORS.faint,
          textAlign: "center",
        }}
      >
        {rank}
      </div>
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 15,
          background: `${accent}26`,
          border: `1px solid ${accent}66`,
          display: "grid",
          placeItems: "center",
          fontFamily: displayFont,
          fontSize: 24,
          fontWeight: 700,
          color: accent,
        }}
      >
        {initials}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: 0.2,
          }}
        >
          {name}
        </div>
        <div
          style={{
            marginTop: 3,
            fontFamily: monoFont,
            fontSize: 13,
            color: COLORS.faint,
          }}
        >
          {solved}
        </div>
      </div>
      {trend !== "flat" ? (
        <div
          style={{
            padding: "5px 11px",
            borderRadius: 999,
            fontFamily: monoFont,
            fontSize: 14,
            fontWeight: 700,
            color: trend === "up" ? COLORS.green : COLORS.red,
            background: trend === "up" ? COLORS.greenSoft : COLORS.redSoft,
          }}
        >
          {trend === "up" ? "+1" : "-1"}
        </div>
      ) : null}
      <div style={{ position: "relative", textAlign: "right" }}>
        <div
          style={{
            fontFamily: monoFont,
            fontSize: 30,
            fontWeight: 700,
            color: highlighted ? COLORS.green : COLORS.text,
            letterSpacing: -0.5,
          }}
        >
          {rating}
        </div>
        <div
          style={{
            marginTop: 2,
            fontFamily: monoFont,
            fontSize: 12,
            color: COLORS.faint,
            letterSpacing: 1.3,
          }}
        >
          RATING
        </div>
        {delta !== undefined ? (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              fontFamily: monoFont,
              fontSize: 19,
              fontWeight: 700,
              color: COLORS.green,
              opacity: interpolate(delta, [0, 0.15, 0.75, 1], [0, 1, 1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: `0px ${interpolate(delta, [0, 1], [0, -48], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}px`,
            }}
          >
            +24
          </div>
        ) : null}
      </div>
    </div>
  );
};
