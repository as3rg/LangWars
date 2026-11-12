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

const code: CodeLine[] = [
  { text: "@solution" },
  { text: "fn two_sum(nums, target) {" },
  { text: "  let i = 0;" },
  { text: "  while (i < length(nums)) {" },
  { text: "    let j = i + 1;" },
  { text: "    while (j < length(nums)) {" },
  { text: "      if (nums[i] + nums[j] == target) {" },
  { text: "        return [i, j];" },
  { text: "      }" },
  { text: "      j = j + 1;" },
  { text: "    }" },
  { text: "    i = i + 1;" },
  { text: "  }" },
  { text: "  return [];" },
  { text: "}" },
];

const FAIL_FRAME = 72;

export const SceneFail: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const typing = interpolate(frame, [6, 64], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.35, 0, 0.2, 1),
  });

  const failed = frame >= FAIL_FRAME;

  const stamp = spring({
    frame: frame - FAIL_FRAME,
    fps,
    config: { damping: 13, stiffness: 180, mass: 0.6 },
  });

  const shakeAmp = interpolate(
    frame,
    [FAIL_FRAME, FAIL_FRAME + 4, FAIL_FRAME + 16],
    [0, 11, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const screenShakeX = Math.sin(frame * 2.1) * shakeAmp;
  const screenShakeY = Math.cos(frame * 2.6) * shakeAmp * 0.6;

  const flash = interpolate(
    frame,
    [FAIL_FRAME, FAIL_FRAME + 3, FAIL_FRAME + 22],
    [0, 0.4, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ fontFamily: displayFont }}>
      <HomeStage
        glow={
          failed ? "rgba(248, 81, 73, 0.24)" : "rgba(88, 166, 255, 0.20)"
        }
      >
        <div
          style={{
            position: "absolute",
            left: 17,
            top: 17,
            width: 1000,
            height: 560,
            translate: `${screenShakeX}px ${screenShakeY}px`,
          }}
        >
          <EditorWindow
            filename="two_sum.lw"
            lines={code}
            typing={typing}
            width={1000}
            height={560}
            compact
            status={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    color: failed ? COLORS.red : COLORS.muted,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      border: `2px solid ${
                        failed ? COLORS.red : COLORS.faint
                      }`,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 19,
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {failed ? "×" : "…"}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        letterSpacing: 0.3,
                      }}
                    >
                      {failed ? "WRONG ANSWER" : "RUNNING TESTS"}
                    </div>
                    <div
                      style={{
                        marginTop: 1,
                        fontFamily: monoFont,
                        fontSize: 13,
                        color: COLORS.muted,
                      }}
                    >
                      {failed
                        ? "test 3 / 20 · expected [0, 1] · got []"
                        : "visible examples · test 3 / 20"}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    fontFamily: monoFont,
                    fontSize: 15,
                    color: failed ? COLORS.red : COLORS.muted,
                  }}
                >
                  {failed ? "17 / 20" : "3 / 20"}
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

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              opacity: interpolate(
                frame,
                [FAIL_FRAME, FAIL_FRAME + 5],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              ),
              scale: interpolate(stamp, [0, 1], [2.2, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              rotate: "-10deg",
            }}
          >
            <div
              style={{
                border: `7px solid ${COLORS.red}`,
                borderRadius: 14,
                padding: "12px 30px 9px",
                background: "rgba(11, 14, 20, 0.68)",
                textAlign: "center",
                boxShadow: "0 0 60px rgba(248, 81, 73, 0.35)",
              }}
            >
              <div
                style={{
                  fontSize: 68,
                  fontWeight: 700,
                  color: COLORS.red,
                  letterSpacing: 8,
                  lineHeight: 1,
                }}
              >
                FAILED
              </div>
              <div
                style={{
                  marginTop: 5,
                  fontFamily: monoFont,
                  fontSize: 16,
                  letterSpacing: 4,
                  color: COLORS.red,
                }}
              >
                3 / 20 TESTS
              </div>
            </div>
          </div>
        </div>
      </HomeStage>

      <div
        style={{
          position: "absolute",
          left: GUY.left,
          top: GUY.top,
          width: GUY.width,
          opacity: interpolate(frame, [0, 14], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: `0px ${
            interpolate(frame, [0, 14], [26, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }) +
            interpolate(frame, [FAIL_FRAME, FAIL_FRAME + 22], [0, 10], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }px`,
          rotate: `${interpolate(
            frame,
            [FAIL_FRAME, FAIL_FRAME + 22],
            [0, 3],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          )}deg`,
        }}
      >
        <SittingGuy
          mood={failed ? "sad" : "coding"}
          typing={!failed}
          width={GUY.width}
        />
      </div>

      <Brand />
      <TaskChip label="TASK 03 · TWO SUM" difficulty="MEDIUM" />
    </AbsoluteFill>
  );
};
