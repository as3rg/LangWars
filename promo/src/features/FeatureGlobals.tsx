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

type ShelfBox = {
  readonly x: number;
  readonly w: number;
  readonly h: number;
  readonly top: number;
  readonly label: string;
  readonly color: string;
  readonly rotate: number;
};

const shelfBoxes: ShelfBox[] = [
  { x: 26, w: 108, h: 92, top: 58, label: "enemy_score", color: "#58a6ff", rotate: -3 },
  { x: 64, w: 62, h: 54, top: 4, label: "todo", color: "#f85149", rotate: -14 },
  { x: 142, w: 84, h: 70, top: 80, label: "length", color: "#3fb950", rotate: 2 },
  { x: 232, w: 120, h: 104, top: 46, label: "two_sum_target", color: "#d29922", rotate: -2 },
  { x: 360, w: 74, h: 62, top: 88, label: "world", color: "#bc8cff", rotate: 4 },
  { x: 442, w: 102, h: 90, top: 60, label: "counter", color: "#8b949e", rotate: -4 },
  { x: 552, w: 88, h: 96, top: 54, label: "answer", color: "#58a6ff", rotate: 3 },
  { x: 648, w: 80, h: 68, top: 82, label: "flag", color: "#3fb950", rotate: -2 },

  { x: 34, w: 94, h: 78, top: 222, label: "set", color: "#58a6ff", rotate: 3 },
  { x: 136, w: 118, h: 96, top: 204, label: "push_back", color: "#3fb950", rotate: -2 },
  { x: 158, w: 64, h: 40, top: 164, label: "fixme", color: "#f85149", rotate: -10 },
  { x: 262, w: 76, h: 66, top: 234, label: "empty", color: "#8b949e", rotate: 5 },
  { x: 346, w: 110, h: 92, top: 208, label: "truthy", color: "#d29922", rotate: -3 },
  { x: 464, w: 70, h: 98, top: 202, label: "eq", color: "#58a6ff", rotate: 2 },
  { x: 542, w: 90, h: 72, top: 228, label: "cmp", color: "#8b949e", rotate: -4 },
  { x: 640, w: 86, h: 94, top: 206, label: "cast", color: "#3fb950", rotate: 3 },

  { x: 60, w: 118, h: 58, top: 302, label: "legacy", color: "#8b949e", rotate: -6 },
  { x: 196, w: 94, h: 48, top: 312, label: "temp_1", color: "#58a6ff", rotate: 5 },
  { x: 308, w: 138, h: 62, top: 298, label: "actually_global", color: "#f85149", rotate: -2 },
  { x: 382, w: 78, h: 44, top: 326, label: "todo", color: "#bc8cff", rotate: 18 },
  { x: 464, w: 98, h: 54, top: 306, label: "dont_touch", color: "#d29922", rotate: 4 },
  { x: 578, w: 88, h: 46, top: 314, label: "maybe", color: "#8b949e", rotate: -4 },
  { x: 678, w: 54, h: 70, top: 290, label: "get", color: "#3fb950", rotate: 8 },
];

export const FeatureGlobals: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stamp = spring({
    frame: frame - 58,
    fps,
    config: { damping: 13, stiffness: 170, mass: 0.7 },
  });

  return (
    <FeatureShell
      index="01 / 04"
      kicker="SPECIAL FEATURE 01"
      title="GLOBAL VARIABLES ONLY"
      subtitle="ONE FLAT SHELF · ZERO CATEGORIES · TRUST US, IT'S STRUCTURED"
    >
      <div
        style={{
          position: "absolute",
          left: 504,
          top: 318,
          scale: 1.2,
          transformOrigin: "top left",
        }}
      >
        <Shelf frame={frame} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 1010,
          top: 734,
          opacity: stamp,
          scale: interpolate(stamp, [0, 1], [1.8, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <Stamp
          text="STRUCTURED"
          subtext="GOOD CODE"
          rotate={-7}
          scale={0.62}
        />
      </div>
    </FeatureShell>
  );
};

const Shelf: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <div
      style={{
        position: "relative",
        width: 760,
        height: 470,
        borderRadius: 18,
        border: `1px solid ${COLORS.border}`,
        background: "#0d1118",
        boxShadow: "0 34px 90px rgba(0,0,0,0.55)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 22px",
          borderBottom: "1px solid #33261a",
          background: "linear-gradient(180deg, #33261a, #241c14)",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: COLORS.amber,
          }}
        />
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 14,
            letterSpacing: 2.4,
            color: "#f0c674",
          }}
        >
          GLOBAL SHELF
        </span>
        <span
          style={{
            marginLeft: "auto",
            padding: "5px 10px",
            borderRadius: 999,
            background: "rgba(63, 185, 80, 0.12)",
            border: "1px solid rgba(63, 185, 80, 0.35)",
            fontFamily: monoFont,
            fontSize: 12,
            letterSpacing: 0.8,
            color: COLORS.green,
          }}
        >
          128 GLOBALS
        </span>
      </div>

      <div
        style={{
          position: "relative",
          height: 414,
          background:
            "linear-gradient(180deg, #131922 0%, #0e131b 68%, #0a0e14 100%)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            opacity: 0.55,
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 12,
            background: "linear-gradient(90deg, #241c14, #3a2d22)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 12,
            background: "linear-gradient(270deg, #241c14, #3a2d22)",
          }}
        />

        {[150, 300].map((top) => (
          <div
            key={top}
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              top,
              height: 16,
              borderRadius: 3,
              background: "linear-gradient(180deg, #4a3828, #2b2118)",
              boxShadow: "0 8px 16px rgba(0,0,0,0.5)",
            }}
          />
        ))}

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 360,
            bottom: 0,
            background: "linear-gradient(180deg, #1a212b, #0d1118)",
            borderTop: "1px solid #33261a",
          }}
        />

        {shelfBoxes.map((box, index) => {
          const appear = interpolate(
            frame,
            [4 + index * 1.6, 10 + index * 1.6],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return (
            <div
              key={index}
              style={{
                position: "absolute",
                left: box.x,
                top: box.top,
                width: box.w,
                height: box.h,
                borderRadius: 4,
                border: `1px solid ${box.color}66`,
                background: `linear-gradient(180deg, ${box.color}22, rgba(10, 14, 20, 0.92))`,
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 14px rgba(0,0,0,0.4)",
                rotate: `${box.rotate + Math.sin(frame * 0.1 + index) * 0.5}deg`,
                opacity: appear,
                translate: `0px ${interpolate(appear, [0, 1], [-18, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 6px 6px",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 6,
                  top: 6,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: box.color,
                }}
              />
              <span
                style={{
                  fontFamily: monoFont,
                  fontSize: 12,
                  lineHeight: 1.15,
                  color: COLORS.text,
                  textAlign: "center",
                  wordBreak: "break-word",
                }}
              >
                {box.label}
              </span>
              {index % 4 === 0 ? (
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    left: "50%",
                    width: 54,
                    height: 7,
                    translate: "-50% 0",
                    rotate: "-4deg",
                    borderRadius: 2,
                    background: "rgba(210, 153, 34, 0.42)",
                  }}
                />
              ) : null}
            </div>
          );
        })}

        <div
          style={{
            position: "absolute",
            left: 26,
            top: 172,
            width: 84,
            height: 58,
            borderRadius: 3,
            background: "#d29922",
            rotate: "-7deg",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 8px 14px rgba(0,0,0,0.4)",
          }}
        >
          <span
            style={{
              fontFamily: monoFont,
              fontSize: 11,
              lineHeight: 1.2,
              color: "#3a2a08",
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            where
            <br />
            is it?
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 18,
            top: 374,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 12px",
            borderRadius: 7,
            border: `1px solid ${COLORS.borderSoft}`,
            background: "rgba(255, 255, 255, 0.035)",
            fontFamily: monoFont,
            fontSize: 11,
            color: COLORS.faint,
          }}
        >
          <span>search: "structure"</span>
          <span style={{ color: COLORS.red }}>0 results</span>
        </div>
      </div>
    </div>
  );
};
