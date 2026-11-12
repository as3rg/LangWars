import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { GUY, HomeStage } from "../components/Room";
import { SittingGuy } from "../components/SittingGuy";
import { Brand, TaskChip } from "../components/Stage";
import { displayFont, monoFont } from "../fonts";
import { COLORS } from "../theme";

export const SceneAftermath: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ fontFamily: displayFont }}>
      <HomeStage glow="rgba(248, 81, 73, 0.16)">
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
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              fontFamily: displayFont,
              fontSize: 300,
              fontWeight: 700,
              letterSpacing: -18,
              color: "rgba(248, 81, 73, 0.05)",
              pointerEvents: "none",
            }}
          >
            ×128
          </div>

          <div
            style={{
              height: 88,
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "0 28px",
              borderBottom: `1px solid ${COLORS.borderSoft}`,
              background: COLORS.panelRaised,
              position: "relative",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: COLORS.redSoft,
                border: "1px solid rgba(248, 81, 73, 0.55)",
                display: "grid",
                placeItems: "center",
                fontSize: 26,
                fontWeight: 700,
                color: COLORS.red,
              }}
            >
              ×
            </div>
            <div>
              <div
                style={{
                  fontSize: 25,
                  fontWeight: 700,
                  color: COLORS.text,
                }}
              >
                RECHECK COMPLETE
              </div>
              <div
                style={{
                  marginTop: 3,
                  fontFamily: monoFont,
                  fontSize: 13,
                  color: COLORS.muted,
                }}
              >
                shared world · 128 submissions re-evaluated
              </div>
            </div>
            <div
              style={{
                marginLeft: "auto",
                fontFamily: monoFont,
                fontSize: 14,
                fontWeight: 700,
                color: COLORS.red,
                padding: "7px 13px",
                borderRadius: 999,
                background: COLORS.redSoft,
              }}
            >
              128 FAILED
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "24px 28px",
              borderBottom: `1px solid ${COLORS.borderSoft}`,
              background: "rgba(248, 81, 73, 0.08)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "rgba(248, 81, 73, 0.16)",
                border: "1px solid rgba(248, 81, 73, 0.5)",
                display: "grid",
                placeItems: "center",
                fontSize: 24,
                fontWeight: 700,
                color: COLORS.red,
              }}
            >
              N
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 27,
                  fontWeight: 700,
                  color: COLORS.faint,
                  textDecoration: "line-through",
                }}
              >
                null_ptr
              </div>
              <div
                style={{
                  marginTop: 3,
                  fontFamily: monoFont,
                  fontSize: 13,
                  color: COLORS.red,
                }}
              >
                solution no longer counts
              </div>
            </div>
            <div
              style={{
                padding: "7px 13px",
                borderRadius: 9,
                background: COLORS.red,
                color: "#1b0705",
                fontFamily: monoFont,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1.1,
              }}
            >
              BROKEN
            </div>
            <div
              style={{
                minWidth: 210,
                textAlign: "right",
                fontFamily: monoFont,
                fontSize: 46,
                fontWeight: 700,
                color: COLORS.red,
                letterSpacing: -1.2,
              }}
            >
              -9,999
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "18px 28px",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(63, 185, 80, 0.14)",
                border: "1px solid rgba(63, 185, 80, 0.4)",
                display: "grid",
                placeItems: "center",
                fontSize: 19,
                fontWeight: 700,
                color: COLORS.green,
              }}
            >
              Y
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{ fontSize: 21, fontWeight: 700, color: COLORS.text }}
              >
                you · #1
              </div>
              <div
                style={{
                  marginTop: 2,
                  fontFamily: monoFont,
                  fontSize: 12,
                  color: COLORS.faint,
                }}
              >
                112 solved · solution intact
              </div>
            </div>
            <div
              style={{
                fontFamily: monoFont,
                fontSize: 27,
                fontWeight: 700,
                color: COLORS.green,
              }}
            >
              1,840
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: 28,
              right: 28,
              bottom: 20,
              display: "flex",
              alignItems: "center",
              fontFamily: monoFont,
              fontSize: 12,
              color: COLORS.muted,
            }}
          >
            <span>world version +1 · no republish required</span>
            <span
              style={{
                marginLeft: "auto",
                color: COLORS.red,
                letterSpacing: 0.6,
              }}
            >
              128 SOLUTIONS VOIDED
            </span>
          </div>
        </div>
      </HomeStage>

      <div
        style={{
          position: "absolute",
          left: GUY.left,
          top: GUY.top,
          width: GUY.width,
          opacity: interpolate(frame, [0, 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: `0px ${interpolate(frame, [0, 20], [14, -4], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}px`,
          rotate: `${interpolate(frame, [0, 20], [1.5, -2.5], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}deg`,
        }}
      >
        <SittingGuy mood="smug" width={GUY.width} />
      </div>

      <Brand />
      <TaskChip label="TASK 03 · TWO SUM" difficulty="SOLVED" />

      <AbsoluteFill
        style={{
          background: "#000",
          opacity: interpolate(frame, [53, 63], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
