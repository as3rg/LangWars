import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { tokenize } from "../components/tokenize";
import { displayFont, monoFont } from "../fonts";
import { COLORS } from "../theme";

const IMPACT_FRAME = 46;
const PANEL_FRAME = 58;

const cardCode = [
  "@solution",
  "fn two_sum(nums, target) {",
  "  let i = 0;",
  "  while (i < length(nums)) {",
  "    if (nums[i] + nums[j] == target) {",
  "      return [i, j];",
  "    }",
  "  }",
  "}",
];

const formatRating = (value: number) => {
  const abs = Math.abs(value).toLocaleString("en-US");
  return value < 0 ? `-${abs}` : abs;
};

export const SceneNuke: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const flight = interpolate(frame, [0, IMPACT_FRAME], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.45, 0, 0.9, 0.55),
  });

  const missileX = -340 + 1320 * flight;
  const missileY = 460 - Math.sin(flight * Math.PI) * 80;
  const missileRotate = 5 + Math.sin(flight * Math.PI) * 4;

  const shakeAmp = interpolate(
    frame,
    [IMPACT_FRAME, IMPACT_FRAME + 4, IMPACT_FRAME + 26],
    [0, 18, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const shakeX = Math.sin(frame * 2.4) * shakeAmp;
  const shakeY = Math.cos(frame * 2.9) * shakeAmp * 0.6;

  const flash = interpolate(
    frame,
    [IMPACT_FRAME, IMPACT_FRAME + 3, IMPACT_FRAME + 22],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const mushroom = spring({
    frame: frame - IMPACT_FRAME,
    fps,
    config: { damping: 60, stiffness: 80, mass: 1.2 },
  });

  const panel = spring({
    frame: frame - PANEL_FRAME,
    fps,
    config: { damping: 16, stiffness: 150, mass: 0.7 },
  });

  const rating = Math.round(
    interpolate(frame, [PANEL_FRAME + 6, PANEL_FRAME + 52], [1852, -9999], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.4, 0, 0.9, 0.3),
    }),
  );
  const broken = frame >= PANEL_FRAME + 14;
  const cardGone = frame >= IMPACT_FRAME;

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 58% 42%, #16243d 0%, #090d16 58%, #04060a 100%)",
        overflow: "hidden",
        fontFamily: displayFont,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -420,
          right: -420,
          bottom: -180,
          height: 780,
          backgroundImage:
            "linear-gradient(rgba(88, 166, 255, 0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(88, 166, 255, 0.11) 1px, transparent 1px)",
          backgroundSize: "92px 92px",
          transform: "perspective(720px) rotateX(64deg)",
          transformOrigin: "center bottom",
          opacity: 0.55,
          maskImage: "linear-gradient(to top, black, transparent 72%)",
          WebkitMaskImage: "linear-gradient(to top, black, transparent 72%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 90,
          top: 54,
          fontFamily: monoFont,
          fontSize: 16,
          letterSpacing: 2,
          color: COLORS.faint,
        }}
      >
        SHARED WORLD · RECHECK QUEUE
      </div>
      <div
        style={{
          position: "absolute",
          right: 90,
          top: 54,
          fontFamily: monoFont,
          fontSize: 16,
          letterSpacing: 2,
          color: COLORS.red,
        }}
      >
        TARGET · null_ptr / two_sum
      </div>

      {[
        { left: 130, top: 240, text: "let two_sum_target = 9;" },
        { left: 250, top: 780, text: "length(nums)" },
        { left: 1580, top: 210, text: "@solution" },
        { left: 1640, top: 840, text: "// shared" },
        { left: 420, top: 620, text: "push_back(world)" },
      ].map((item, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: item.left,
            top: item.top,
            fontFamily: monoFont,
            fontSize: 16,
            color: "rgba(139, 148, 158, 0.25)",
            rotate: index % 2 === 0 ? "-2deg" : "2deg",
          }}
        >
          {item.text}
        </div>
      ))}

      <div
        style={{
          position: "absolute",
          inset: 0,
          translate: `${shakeX}px ${shakeY}px`,
        }}
      >
        {!cardGone ? (
          <TargetCard threat={frame / IMPACT_FRAME} />
        ) : null}

        {!cardGone ? (
          <div
            style={{
              position: "absolute",
              left: 1180,
              top: 500,
              width: 210,
              height: 210,
              translate: "-50% -50%",
              opacity: interpolate(
                frame,
                [6, 16, IMPACT_FRAME - 4, IMPACT_FRAME],
                [0, 1, 1, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              ),
              scale: 1 + Math.sin(frame * 0.32) * 0.03,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: `2px solid ${
                  frame > IMPACT_FRAME - 10 ? COLORS.red : COLORS.green
                }`,
                opacity: 0.55,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: -14,
                bottom: -14,
                width: 2,
                translate: "-50% 0",
                background: COLORS.red,
                opacity: 0.45,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: -14,
                right: -14,
                height: 2,
                translate: "0 -50%",
                background: COLORS.red,
                opacity: 0.45,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                translate: "-50% -50%",
                fontFamily: monoFont,
                fontSize: 14,
                letterSpacing: 2,
                color:
                  frame > IMPACT_FRAME - 10 ? COLORS.red : COLORS.green,
              }}
            >
              LOCKED
            </div>
          </div>
        ) : null}

        {!cardGone ? (
          <>
            {Array.from({ length: 12 }).map((_, index) => {
              const trailFlight = Math.max(0, flight - (index + 1) * 0.025);
              const trailX = -340 + 1320 * trailFlight;
              const trailY =
                460 - Math.sin(trailFlight * Math.PI) * 80 + 40;
              return (
                <div
                  key={index}
                  style={{
                    position: "absolute",
                    left: trailX,
                    top: trailY,
                    width: 18 - index,
                    height: 18 - index,
                    borderRadius: "50%",
                    background: `rgba(248, 81, 73, ${0.5 - index * 0.035})`,
                    filter: "blur(1px)",
                  }}
                />
              );
            })}
            <div
              style={{
                position: "absolute",
                left: missileX,
                top: missileY,
                rotate: `${missileRotate}deg`,
              }}
            >
              <Missile />
            </div>
          </>
        ) : null}

        {frame >= IMPACT_FRAME - 2 ? (
          <>
            <AbsoluteFill
              style={{
                background: COLORS.red,
                opacity: flash,
                pointerEvents: "none",
              }}
            />
            {[0, 6, 13].map((delay) => {
              const progress = interpolate(
                frame,
                [IMPACT_FRAME + delay, IMPACT_FRAME + 42 + delay],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              );
              const size = interpolate(progress, [0, 1], [120, 1900]);
              return (
                <div
                  key={delay}
                  style={{
                    position: "absolute",
                    left: 1180 - size / 2,
                    top: 480 - size / 2,
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    border: `${interpolate(
                      progress,
                      [0, 1],
                      [8, 1],
                    )}px solid rgba(248, 81, 73, ${
                      0.6 * (1 - progress)
                    })`,
                    opacity: 1 - progress,
                  }}
                />
              );
            })}
            <Mushroom progress={mushroom} frame={frame} />
            <Particles frame={frame} />
          </>
        ) : null}

        {frame >= PANEL_FRAME ? (
          <div
            style={{
              position: "absolute",
              left: 560,
              top: 300,
              width: 800,
              height: 460,
              opacity: interpolate(panel, [0, 1], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              scale: interpolate(panel, [0, 1], [0.92, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: `0px ${interpolate(panel, [0, 1], [28, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}px`,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 24,
                border: `1px solid rgba(248, 81, 73, 0.45)`,
                background: "rgba(12, 16, 23, 0.97)",
                boxShadow:
                  "0 50px 140px rgba(0, 0, 0, 0.75), 0 0 100px rgba(248, 81, 73, 0.18)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: 104,
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: "0 30px",
                  borderBottom: `1px solid ${COLORS.borderSoft}`,
                  background: COLORS.panelRaised,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: COLORS.redSoft,
                    border: `1px solid rgba(248, 81, 73, 0.55)`,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 29,
                    fontWeight: 700,
                    color: COLORS.red,
                  }}
                >
                  ×
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 29,
                      fontWeight: 700,
                      color: COLORS.text,
                      letterSpacing: 0.3,
                    }}
                  >
                    RECHECK FAILED
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontFamily: monoFont,
                      fontSize: 14,
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
                    fontSize: 15,
                    fontWeight: 700,
                    color: COLORS.red,
                    padding: "7px 14px",
                    borderRadius: 999,
                    background: COLORS.redSoft,
                  }}
                >
                  ×128
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: "22px 28px",
                  borderBottom: `1px solid ${COLORS.borderSoft}`,
                  background: broken
                    ? "rgba(248, 81, 73, 0.09)"
                    : "rgba(255, 255, 255, 0.02)",
                }}
              >
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 15,
                    background: broken
                      ? "rgba(248, 81, 73, 0.16)"
                      : "rgba(63, 185, 80, 0.14)",
                    border: `1px solid ${
                      broken ? "rgba(248, 81, 73, 0.5)" : "rgba(63, 185, 80, 0.4)"
                    }`,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 24,
                    fontWeight: 700,
                    color: broken ? COLORS.red : COLORS.green,
                  }}
                >
                  N
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 27,
                      fontWeight: 700,
                      color: broken ? COLORS.faint : COLORS.text,
                      textDecoration: broken ? "line-through" : "none",
                    }}
                  >
                    null_ptr
                  </div>
                  <div
                    style={{
                      marginTop: 3,
                      fontFamily: monoFont,
                      fontSize: 13,
                      color: broken ? COLORS.red : COLORS.faint,
                    }}
                  >
                    {broken ? "solution no longer counts" : "two_sum.lw"}
                  </div>
                </div>
                {broken ? (
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
                ) : null}
                <div
                  style={{
                    minWidth: 230,
                    textAlign: "right",
                    fontFamily: monoFont,
                    fontSize: 52,
                    fontWeight: 700,
                    color: COLORS.red,
                    letterSpacing: -1.5,
                    lineHeight: 1,
                  }}
                >
                  {formatRating(rating)}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 28px",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    background: "rgba(63, 185, 80, 0.14)",
                    border: `1px solid rgba(63, 185, 80, 0.4)`,
                    display: "grid",
                    placeItems: "center",
                    fontFamily: displayFont,
                    fontSize: 18,
                    fontWeight: 700,
                    color: COLORS.green,
                  }}
                >
                  Y
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 20, fontWeight: 700, color: COLORS.text }}
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
                    fontSize: 26,
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
                  bottom: 18,
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
          </div>
        ) : null}
      </div>

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 48%, transparent 42%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

const TargetCard: React.FC<{ threat: number }> = ({ threat }) => {
  const shake = Math.sin(threat * 90) * interpolate(threat, [0, 0.8, 1], [0, 2, 8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 820,
        top: 300,
        width: 760,
        height: 420,
        borderRadius: 20,
        border: "1px solid rgba(63, 185, 80, 0.45)",
        background: "rgba(12, 16, 23, 0.96)",
        boxShadow:
          "0 34px 100px rgba(0,0,0,0.65), 0 0 80px rgba(63, 185, 80, 0.12)",
        overflow: "hidden",
        translate: `${shake}px 0px`,
      }}
    >
      <div
        style={{
          height: 94,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 26px",
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          background: COLORS.panelRaised,
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            background: "rgba(63, 185, 80, 0.14)",
            border: "1px solid rgba(63, 185, 80, 0.4)",
            display: "grid",
            placeItems: "center",
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.green,
          }}
        >
          N
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.text }}>
            null_ptr
          </div>
          <div
            style={{
              marginTop: 2,
              fontFamily: monoFont,
              fontSize: 13,
              color: COLORS.faint,
            }}
          >
            two_sum.lw · published
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              background: COLORS.greenSoft,
              border: "1px solid rgba(63, 185, 80, 0.4)",
              fontFamily: monoFont,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1,
              color: COLORS.green,
            }}
          >
            ACCEPTED
          </div>
          <div
            style={{
              fontFamily: monoFont,
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.green,
            }}
          >
            1852
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "18px 26px",
          fontFamily: monoFont,
          fontSize: 17,
          lineHeight: 1.65,
          whiteSpace: "pre",
        }}
      >
        {cardCode.map((line, index) => (
          <div key={index}>
            {tokenize(line).map((token, tokenIndex) => (
              <span
                key={tokenIndex}
                style={{
                  color: token.color,
                  fontStyle: token.italic ? "italic" : "normal",
                }}
              >
                {token.text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const Missile: React.FC = () => {
  const frame = useCurrentFrame();
  const flicker = 0.75 + Math.abs(Math.sin(frame * 0.9)) * 0.55;

  return (
    <svg
      viewBox="0 0 240 90"
      width={220}
      height={82}
      style={{
        overflow: "visible",
        filter: "drop-shadow(0 0 18px rgba(248, 81, 73, 0.55))",
      }}
    >
      <defs>
        <linearGradient id="missileBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d7dee8" />
          <stop offset="55%" stopColor="#8896a8" />
          <stop offset="100%" stopColor="#4d5a6c" />
        </linearGradient>
        <linearGradient id="flame" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#fff2b0" />
          <stop offset="45%" stopColor="#ffa657" />
          <stop offset="100%" stopColor="rgba(248, 81, 73, 0)" />
        </linearGradient>
      </defs>
      <g
        style={{
          transform: `scaleX(${flicker})`,
          transformOrigin: "50px 45px",
        }}
      >
        <path d="M50 45 L-10 22 L18 45 L-10 68 Z" fill="url(#flame)" />
      </g>
      <path d="M92 22 L78 4 L120 26 Z" fill="#4d5a6c" />
      <path d="M92 68 L78 86 L120 64 Z" fill="#4d5a6c" />
      <rect
        x="42"
        y="28"
        width="152"
        height="34"
        rx="17"
        fill="url(#missileBody)"
      />
      <path d="M188 28 L232 45 L188 62 Z" fill="#f85149" />
      <circle cx="66" cy="45" r="6" fill="#1b0705" opacity="0.35" />
      <circle cx="158" cy="40" r="8" fill="#58a6ff" opacity="0.75" />
    </svg>
  );
};

const Mushroom: React.FC<{ progress: number; frame: number }> = ({
  progress,
  frame,
}) => {
  const scale = interpolate(progress, [0, 1], [0.18, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(
    frame,
    [IMPACT_FRAME + 2, IMPACT_FRAME + 12, IMPACT_FRAME + 44, IMPACT_FRAME + 70],
    [0, 1, 0.9, 0.42],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        position: "absolute",
        left: 1180,
        top: 560,
        width: 1,
        height: 1,
        opacity,
        scale,
        translate: "0 -50%",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -75,
          top: -40,
          width: 150,
          height: 320,
          borderRadius: 70,
          background:
            "linear-gradient(180deg, #ffb86b 0%, #f85149 45%, rgba(248, 81, 73, 0) 100%)",
          filter: "blur(3px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -230,
          top: -300,
          width: 460,
          height: 340,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 45% 40%, #ffe3b0 0%, #ffb86b 28%, #f85149 62%, rgba(248, 81, 73, 0) 100%)",
          filter: "blur(4px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -330,
          top: -230,
          width: 260,
          height: 230,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 50% 45%, #ffd08a 0%, #f85149 58%, rgba(248, 81, 73, 0) 100%)",
          filter: "blur(6px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 90,
          top: -240,
          width: 280,
          height: 250,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 50% 45%, #ffd08a 0%, #f85149 58%, rgba(248, 81, 73, 0) 100%)",
          filter: "blur(6px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -70,
          top: -340,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, #fff4cf 0%, #ffb86b 42%, rgba(255, 184, 107, 0) 100%)",
          filter: "blur(2px)",
        }}
      />
    </div>
  );
};

const Particles: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <>
      {Array.from({ length: 28 }).map((_, index) => {
        const angle = (index / 28) * Math.PI * 2;
        const progress = interpolate(
          frame,
          [IMPACT_FRAME, IMPACT_FRAME + 48 + (index % 4) * 5],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const distance = 80 + (index % 6) * 44;
        const x = 1180 + Math.cos(angle) * distance * progress;
        const y =
          480 +
          Math.sin(angle) * distance * 0.7 * progress +
          progress * progress * 120;
        const size = 5 + (index % 5) * 3;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: index % 3 === 0 ? "50%" : 2,
              background:
                index % 2 === 0 ? COLORS.red : "#ffb86b",
              opacity: 1 - progress,
              rotate: `${progress * (index % 2 === 0 ? 220 : -180)}deg`,
            }}
          />
        );
      })}
    </>
  );
};
