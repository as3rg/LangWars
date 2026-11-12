import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { displayFont } from "../fonts";
import { COLORS } from "../theme";
import { DuckKnight } from "./CompetitionIcons";

export const DuckJoust: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const charge = interpolate(frame, [4, 74], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.7, 1),
  });

  const leftX = -220 + charge * 420;
  const rightX = 1260 - charge * 420;
  const bob = Math.sin(frame * 0.18) * 6;
  const shake =
    Math.sin(frame * 2.4) *
    interpolate(frame, [70, 76, 88], [0, 14, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  const bubble = spring({
    frame: frame - 22,
    fps,
    config: { damping: 12, stiffness: 180, mass: 0.6 },
  });

  const impact = interpolate(frame, [70, 76, 90], [0, 1, 0.25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#0b0e14" }}>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, #111c33 0%, #3a2a4b 26%, #7a3f4a 46%, #c26b4a 60%, #f0a05e 72%, #f7c27c 78%, #241713 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 1190,
          top: 330,
          width: 480,
          height: 480,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, #fff1c9 0%, #ffd08a 36%, rgba(255, 184, 107, 0.35) 60%, transparent 72%)",
          filter: "blur(6px)",
        }}
      />

      {[
        { left: 120, top: 240, w: 460, h: 110, opacity: 0.14 },
        { left: 760, top: 180, w: 380, h: 90, opacity: 0.1 },
        { left: 1480, top: 280, w: 320, h: 80, opacity: 0.12 },
        { left: 520, top: 360, w: 300, h: 70, opacity: 0.08 },
      ].map((cloud, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: cloud.left,
            top: cloud.top,
            width: cloud.w,
            height: cloud.h,
            borderRadius: "50%",
            background: "#ffd9a8",
            opacity: cloud.opacity,
            filter: "blur(18px)",
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          left: -120,
          top: 620,
          width: 920,
          height: 260,
          borderRadius: "50% 60% 0 0",
          background: "#3a2130",
          opacity: 0.85,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -140,
          top: 660,
          width: 900,
          height: 220,
          borderRadius: "60% 50% 0 0",
          background: "#2c1a26",
          opacity: 0.9,
        }}
      />

      <div style={{ position: "absolute", left: 210, top: 600 }}>
        <div
          style={{
            position: "absolute",
            left: 40,
            top: 80,
            width: 80,
            height: 130,
            background: "#241626",
            borderRadius: 3,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 40,
            width: 54,
            height: 170,
            background: "#241626",
            borderRadius: 3,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 22,
            width: 54,
            height: 30,
            background: "#241626",
            clipPath: "polygon(0 100%, 50% 0, 100% 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 104,
            top: 110,
            width: 36,
            height: 100,
            background: "#241626",
            borderRadius: 3,
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 760,
          bottom: 0,
          background:
            "linear-gradient(180deg, #4a3325 0%, #2a1b15 46%, #150e0c 100%)",
        }}
      />
      {Array.from({ length: 16 }).map((_, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: `${index * 7 - 10}%`,
            top: 780 + (index % 4) * 46,
            width: 260,
            height: 2,
            background: "rgba(255, 220, 170, 0.08)",
            rotate: "-4deg",
          }}
        />
      ))}

      <AbsoluteFill
        style={{ translate: `${shake}px 0px`, scale: 1 + frame * 0.0004 }}
      >
        <div
          style={{
            position: "absolute",
            left: leftX,
            top: 430 + bob,
            width: 760,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 120,
              top: 470,
              width: 520,
              height: 60,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.45)",
              filter: "blur(14px)",
            }}
          />
          <DuckKnight width={760} color={COLORS.blue} />
        </div>

        <div
          style={{
            position: "absolute",
            left: rightX,
            top: 430 + Math.sin(frame * 0.18 + 2) * 6,
            width: 760,
            scale: "-1 1",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 120,
              top: 470,
              width: 520,
              height: 60,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.45)",
              filter: "blur(14px)",
            }}
          />
          <DuckKnight width={760} color={COLORS.red} />
        </div>

        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={`dust-left-${index}`}
            style={{
              position: "absolute",
              left: leftX - index * 44,
              top: 900 + (index % 3) * 18,
              width: 90 + index * 16,
              height: 40 + index * 5,
              borderRadius: "50%",
              background: "rgba(214, 170, 120, 0.14)",
              filter: "blur(10px)",
            }}
          />
        ))}
        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={`dust-right-${index}`}
            style={{
              position: "absolute",
              left: rightX + 760 + index * 44,
              top: 900 + (index % 3) * 18,
              width: 90 + index * 16,
              height: 40 + index * 5,
              borderRadius: "50%",
              background: "rgba(214, 170, 120, 0.14)",
              filter: "blur(10px)",
            }}
          />
        ))}

        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={`speed-${index}`}
            style={{
              position: "absolute",
              left: (index * 197 + frame * 14) % 1920,
              top: 820 + (index % 5) * 28,
              width: 150,
              height: 3,
              borderRadius: 2,
              background: "rgba(255, 230, 190, 0.18)",
              rotate: "-3deg",
            }}
          />
        ))}

        {impact > 0.01 ? (
          <div
            style={{
              position: "absolute",
              left: 960,
              top: 500,
              width: 420,
              height: 420,
              translate: "-50% -50%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255, 244, 207, 0.85), rgba(255, 184, 107, 0.4) 35%, transparent 68%)",
              opacity: impact,
              filter: "blur(6px)",
            }}
          />
        ) : null}
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          left: 300,
          top: 500,
          opacity: bubble,
          scale: interpolate(bubble, [0, 1], [0.5, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          rotate: "-7deg",
        }}
      >
        <div
          style={{
            position: "relative",
            padding: "18px 30px",
            borderRadius: 26,
            background: "#f7f1e3",
            border: "5px solid #151a21",
            fontFamily: displayFont,
            fontSize: 52,
            fontWeight: 700,
            color: "#151a21",
            letterSpacing: 2,
            boxShadow: "0 16px 30px rgba(0,0,0,0.35)",
          }}
        >
          QUACK!
          <div
            style={{
              position: "absolute",
              left: 54,
              bottom: -28,
              width: 0,
              height: 0,
              borderLeft: "20px solid transparent",
              borderRight: "0 solid transparent",
              borderTop: "30px solid #151a21",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 59,
              bottom: -18,
              width: 0,
              height: 0,
              borderLeft: "14px solid transparent",
              borderRight: "0 solid transparent",
              borderTop: "22px solid #f7f1e3",
            }}
          />
        </div>
      </div>

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 48%, transparent 48%, rgba(0,0,0,0.62) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
