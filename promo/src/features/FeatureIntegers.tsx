import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { monoFont } from "../fonts";
import { COLORS } from "../theme";
import { FeatureShell, Stamp } from "./FeatureChrome";

const RANGE_MIN = -1_000_000;
const RANGE_MAX = 1_000_000;
const BAR_LEFT = 220;
const BAR_WIDTH = 1480;

const format = (value: number) => {
  const abs = Math.abs(value).toLocaleString("en-US");
  return value < 0 ? `-${abs}` : abs;
};

export const FeatureIntegers: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const before = Math.round(
    interpolate(frame, [8, 40], [999_960, RANGE_MAX], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const after = Math.round(
    interpolate(frame, [46, 82], [RANGE_MIN, -999_960], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const value = frame < 44 ? before : after;

  const wrapFlash = interpolate(
    frame,
    [38, 42, 46, 54],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const shake =
    Math.sin(frame * 3.4) *
    interpolate(frame, [37, 42, 50], [0, 13, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  const markerX = ((value - RANGE_MIN) / (RANGE_MAX - RANGE_MIN)) * BAR_WIDTH;

  const stamp = spring({
    frame: frame - 46,
    fps,
    config: { damping: 12, stiffness: 170, mass: 0.7 },
  });

  return (
    <FeatureShell
      index="02 / 04"
      kicker="SPECIAL FEATURE 02"
      title="INTEGER OVERFLOW"
      subtitle="RANGE [−1,000,000, 1,000,000] · WRAP AROUND · MATH IS A SUGGESTION"
      accent={COLORS.amber}
    >
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 336,
          width: 410,
          height: 196,
          borderRadius: 16,
          border: `1px solid ${COLORS.border}`,
          background: COLORS.panel,
          overflow: "hidden",
          boxShadow: "0 28px 70px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            height: 44,
            display: "flex",
            alignItems: "center",
            padding: "0 18px",
            borderBottom: `1px solid ${COLORS.borderSoft}`,
            background: COLORS.panelRaised,
            fontFamily: monoFont,
            fontSize: 14,
            color: COLORS.muted,
          }}
        >
          wrap.lw
        </div>
        <div
          style={{
            padding: "16px 20px",
            fontFamily: monoFont,
            fontSize: 19,
            lineHeight: 1.7,
            whiteSpace: "pre",
          }}
        >
          <div>
            <span style={{ color: "#ff7b72" }}>let</span>{" "}
            <span style={{ color: "#c9d1d9" }}>x</span>{" "}
            <span style={{ color: "#8b949e" }}>=</span>{" "}
            <span style={{ color: "#79c0ff" }}>1000000</span>
            <span style={{ color: "#8b949e" }}>;</span>
          </div>
          <div>
            <span style={{ color: "#c9d1d9" }}>x</span>{" "}
            <span style={{ color: "#8b949e" }}>= x +</span>{" "}
            <span style={{ color: "#79c0ff" }}>1</span>
            <span style={{ color: "#8b949e" }}>;</span>
          </div>
          <div style={{ color: "#6e7681", fontStyle: "italic" }}>
            // x = -1000000
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 560,
          top: 322,
          width: 1220,
          textAlign: "center",
          translate: `${shake}px 0px`,
        }}
      >
        <div
          style={{
            fontFamily: monoFont,
            fontSize: 16,
            letterSpacing: 3,
            color: COLORS.faint,
          }}
        >
          INT VALUE
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: monoFont,
            fontSize: 196,
            fontWeight: 700,
            color: wrapFlash > 0.4 ? COLORS.red : COLORS.green,
            letterSpacing: -6,
            lineHeight: 1,
            textShadow:
              wrapFlash > 0.4
                ? "0 0 70px rgba(248, 81, 73, 0.5)"
                : "0 0 70px rgba(63, 185, 80, 0.25)",
          }}
        >
          {format(value)}
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: monoFont,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 5,
            color: frame >= 44 ? COLORS.amber : COLORS.green,
            opacity: interpolate(frame, [40, 46], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          WRAP
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: BAR_LEFT,
          top: 706,
          width: BAR_WIDTH,
          height: 18,
          borderRadius: 9,
          background:
            "linear-gradient(90deg, rgba(248,81,73,0.35), rgba(255,255,255,0.10) 50%, rgba(248,81,73,0.35))",
          border: `1px solid ${COLORS.borderSoft}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: BAR_WIDTH / 2 - 1,
            top: -8,
            width: 2,
            height: 34,
            background: "rgba(255,255,255,0.22)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: markerX - 9,
            top: -9,
            width: 18,
            height: 36,
            borderRadius: 6,
            background: frame >= 44 ? COLORS.amber : COLORS.green,
            boxShadow: `0 0 26px ${
              frame >= 44 ? "rgba(210,153,34,0.65)" : "rgba(63,185,80,0.6)"
            }`,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: BAR_LEFT,
          top: 744,
          width: BAR_WIDTH,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: monoFont,
          fontSize: 16,
          color: COLORS.faint,
        }}
      >
        <span>-1,000,000</span>
        <span>0</span>
        <span>1,000,000</span>
      </div>

      <div
        style={{
          position: "absolute",
          left: 1400,
          top: 126,
          opacity: stamp,
          scale: interpolate(stamp, [0, 1], [1.8, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <Stamp
          text="LOGICAL"
          subtext="AS FUCK"
          color={COLORS.amber}
          rotate={7}
          scale={0.78}
        />
      </div>
    </FeatureShell>
  );
};
