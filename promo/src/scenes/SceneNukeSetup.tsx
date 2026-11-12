import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { EditorWindow, type CodeLine } from "../components/EditorWindow";
import { GUY, HomeStage } from "../components/Room";
import { SittingGuy } from "../components/SittingGuy";
import { Brand, TaskChip } from "../components/Stage";
import { displayFont, monoFont } from "../fonts";
import { COLORS } from "../theme";

const worldCode: CodeLine[] = [
  { text: "// shared world · published by null_ptr" },
  { text: "let two_sum_input  = [2, 7, 11, 15];" },
  { text: "let two_sum_target = 9;" },
  { text: 'let two_sum_owner  = "null_ptr";' },
  { text: "" },
  { text: "// overwrite the published value" },
  { text: "two_sum_target = -9999;", danger: true },
];

const PRESS_FRAME = 56;

export const SceneNukeSetup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const typing = interpolate(frame, [8, 52], [0.875, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.3, 0, 0.2, 1),
  });

  const pressed = frame >= PRESS_FRAME;

  const press = spring({
    frame: frame - PRESS_FRAME,
    fps,
    config: { damping: 9, stiffness: 220, mass: 0.5 },
  });

  const flash = interpolate(
    frame,
    [PRESS_FRAME, PRESS_FRAME + 4, PRESS_FRAME + 20],
    [0, 0.55, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const screenShake =
    Math.sin(frame * 2.6) *
    interpolate(frame, [PRESS_FRAME, PRESS_FRAME + 4, PRESS_FRAME + 24], [0, 9, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  return (
    <AbsoluteFill style={{ fontFamily: displayFont }}>
      <HomeStage
        glow={
          pressed ? "rgba(248, 81, 73, 0.30)" : "rgba(210, 153, 34, 0.20)"
        }
      >
        <div
          style={{
            position: "absolute",
            left: 17,
            top: 17,
            width: 1000,
            height: 560,
            translate: `${screenShake}px 0px`,
          }}
        >
          <EditorWindow
            filename="shared_world.lw"
            lines={worldCode}
            typing={typing}
            width={1000}
            height={560}
            fontSize={21}
            compact
            status={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: pressed ? COLORS.red : COLORS.amber,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: `2px solid ${
                        pressed ? COLORS.red : COLORS.amber
                      }`,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 18,
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {pressed ? "×" : "!"}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {pressed ? "WORLD UPDATED" : "SHARED STATE"}
                    </div>
                    <div
                      style={{
                        marginTop: 1,
                        fontFamily: monoFont,
                        fontSize: 12,
                        color: COLORS.muted,
                      }}
                    >
                      {pressed
                        ? "128 dependent submissions rechecking"
                        : "128 submissions depend on this value"}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    padding: "12px 24px",
                    borderRadius: 11,
                    background: COLORS.red,
                    color: "#1b0705",
                    fontSize: 19,
                    fontWeight: 700,
                    letterSpacing: 1.2,
                    scale: interpolate(press, [0, 1], [1, 0.88], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                    boxShadow: pressed
                      ? "0 0 0 rgba(0,0,0,0)"
                      : "0 0 38px rgba(248, 81, 73, 0.35)",
                  }}
                >
                  PUBLISH
                </div>
              </div>
            }
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              background: COLORS.red,
              opacity: flash,
              pointerEvents: "none",
            }}
          />
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
          translate: `0px ${interpolate(frame, [PRESS_FRAME, PRESS_FRAME + 20], [0, -8], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}px`,
          rotate: `${interpolate(frame, [PRESS_FRAME, PRESS_FRAME + 20], [0, -2], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}deg`,
        }}
      >
        <SittingGuy
          mood={pressed ? "smug" : "coding"}
          typing={!pressed}
          width={GUY.width}
        />
      </div>

      <Brand />
      <TaskChip label="SHARED WORLD" difficulty="128 LIVE" />

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 62% 48%, rgba(248, 81, 73, 0.18), transparent 60%)",
          opacity: pressed ? 1 : 0,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
