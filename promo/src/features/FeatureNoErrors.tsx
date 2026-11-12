import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { displayFont, monoFont } from "../fonts";
import { COLORS } from "../theme";
import { FeatureShell, Stamp } from "./FeatureChrome";

const errors = [
  {
    title: "DIVISION BY ZERO",
    detail: "returns 42",
    x: 0,
    y: 0,
    rotate: -6,
  },
  {
    title: "INDEX OUT OF BOUNDS",
    detail: "wraps around",
    x: 520,
    y: 10,
    rotate: 5,
  },
  {
    title: "UNDEFINED NAME",
    detail: "creates int 0",
    x: 0,
    y: 148,
    rotate: 4,
  },
  {
    title: "TYPE MISMATCH",
    detail: "casts anyway",
    x: 520,
    y: 158,
    rotate: -5,
  },
  {
    title: "STACK OVERFLOW",
    detail: "no exceptions",
    x: 0,
    y: 296,
    rotate: 6,
  },
  {
    title: "CONTRACT VIOLATION",
    detail: "recheck failed",
    x: 520,
    y: 306,
    rotate: -4,
  },
];

export const FeatureNoErrors: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stamp = spring({
    frame: frame - 44,
    fps,
    config: { damping: 12, stiffness: 190, mass: 0.65 },
  });

  const reliability = Math.round(
    interpolate(frame, [44, 70], [0, 100], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  return (
    <FeatureShell
      index="04 / 04"
      kicker="SPECIAL FEATURE 04"
      title="NO ERRORS"
      subtitle="WE DON'T THROW ERRORS · WE THROW THEM AWAY · MAXIMUM RELIABILITY"
      accent={COLORS.red}
    >
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 336,
          width: 1060,
          height: 440,
        }}
      >
        {errors.map((error, index) => {
          const start = 6 + index * 4;
          const appear = interpolate(
            frame,
            [start, start + 10],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          const dismiss = interpolate(
            frame,
            [46, 58],
            [1, 0.26],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return (
            <div
              key={index}
              style={{
                position: "absolute",
                left: error.x,
                top: error.y,
                width: 440,
                height: 116,
                borderRadius: 14,
                border: `1px solid rgba(248, 81, 73, 0.42)`,
                background: "rgba(20, 16, 20, 0.92)",
                boxShadow: "0 18px 44px rgba(0, 0, 0, 0.35)",
                opacity: appear * dismiss,
                translate: `${interpolate(appear, [0, 1], [-38, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })}px ${interpolate(appear, [0, 1], [24, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })}px`,
                rotate: `${error.rotate}deg`,
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "0 20px",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 11,
                  background: COLORS.redSoft,
                  border: "1px solid rgba(248, 81, 73, 0.55)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: displayFont,
                  fontSize: 24,
                  fontWeight: 700,
                  color: COLORS.red,
                  flexShrink: 0,
                }}
              >
                !
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: monoFont,
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: 1,
                    color: COLORS.red,
                    whiteSpace: "nowrap",
                  }}
                >
                  {error.title}
                </div>
                <div
                  style={{
                    marginTop: 5,
                    fontFamily: monoFont,
                    fontSize: 15,
                    color: COLORS.muted,
                  }}
                >
                  {error.detail}
                </div>
              </div>
            </div>
          );
        })}

        <div
          style={{
            position: "absolute",
            left: 280,
            top: 166,
            opacity: stamp,
            scale: interpolate(stamp, [0, 1], [2.1, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <Stamp
            text="IGNORED"
            subtext="NOT AN ERROR"
            color={COLORS.green}
            rotate={-8}
            scale={0.9}
          />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 1270,
          top: 336,
          width: 530,
          height: 440,
          borderRadius: 20,
          border: `1px solid rgba(63, 185, 80, 0.4)`,
          background: "rgba(12, 18, 16, 0.94)",
          boxShadow: "0 34px 90px rgba(0, 0, 0, 0.45)",
          padding: "28px 30px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontFamily: monoFont,
            fontSize: 14,
            letterSpacing: 2.4,
            color: COLORS.faint,
          }}
        >
          RELIABILITY
          <span
            style={{
              marginLeft: "auto",
              padding: "5px 10px",
              borderRadius: 999,
              background: COLORS.greenSoft,
              color: COLORS.green,
              fontSize: 12,
              letterSpacing: 1,
            }}
          >
            0 ERRORS
          </span>
        </div>

        <div
          style={{
            marginTop: 22,
            fontFamily: monoFont,
            fontSize: 112,
            fontWeight: 700,
            color: COLORS.green,
            letterSpacing: -5,
            lineHeight: 1,
          }}
        >
          {reliability}%
        </div>

        <div
          style={{
            marginTop: 10,
            fontFamily: displayFont,
            fontSize: 27,
            fontWeight: 700,
            color: COLORS.text,
          }}
        >
          MAXIMUM RELIABILITY
        </div>

        <div
          style={{
            marginTop: 24,
            height: 16,
            borderRadius: 8,
            background: "rgba(255, 255, 255, 0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${reliability}%`,
              height: "100%",
              borderRadius: 8,
              background: COLORS.green,
              boxShadow: "0 0 30px rgba(63, 185, 80, 0.6)",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 26,
            padding: "14px 16px",
            borderRadius: 10,
            border: `1px solid ${COLORS.borderSoft}`,
            background: "rgba(255, 255, 255, 0.025)",
            fontFamily: monoFont,
            fontSize: 16,
            lineHeight: 1.7,
            color: COLORS.muted,
          }}
        >
          <div>
            <span style={{ color: COLORS.faint }}>errors thrown</span>{" "}
            <span style={{ color: COLORS.green }}>0</span>
          </div>
          <div>
            <span style={{ color: COLORS.faint }}>errors ignored</span>{" "}
            <span style={{ color: COLORS.green }}>all</span>
          </div>
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: monoFont,
            fontSize: 15,
            color: COLORS.muted,
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: COLORS.greenSoft,
              display: "grid",
              placeItems: "center",
              color: COLORS.green,
              fontWeight: 700,
            }}
          >
            ✓
          </span>
          <span>1 / 0 == 42, not an error</span>
        </div>
      </div>
    </FeatureShell>
  );
};
