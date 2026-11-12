import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { Confetti } from "./CompetitionChrome";
import { Cake, Clown } from "./CompetitionIcons";

const clowns = [
  { left: -40, top: 380, width: 560, outfit: "#1f6feb", hair: "#f85149" },
  { left: 740, top: 470, width: 440, outfit: "#bc8cff", hair: "#58a6ff" },
  { left: 1440, top: 400, width: 520, outfit: "#3fb950", hair: "#f0883e" },
];

export const ClownCakeFilm: React.FC = () => {
  const frame = useCurrentFrame();

  const cakeOne = interpolate(frame, [6, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.35, 0, 0.7, 1),
  });
  const cakeTwo = interpolate(frame, [14, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.3, 0, 0.75, 1),
  });
  const lensCake = interpolate(frame, [48, 68], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.9, 0.6),
  });

  const splat = interpolate(frame, [64, 74], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const shake =
    Math.sin(frame * 2.7) *
    interpolate(frame, [64, 70, 84], [0, 16, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        background:
          "radial-gradient(ellipse at 50% 28%, #5a1a1a 0%, #2a0d10 55%, #0d0709 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -80,
          top: -40,
          bottom: -40,
          width: 460,
          background:
            "repeating-linear-gradient(90deg, #7a1f24 0 44px, #541217 44px 88px)",
          rotate: "4deg",
          boxShadow: "20px 0 60px rgba(0,0,0,0.45)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -80,
          top: -40,
          bottom: -40,
          width: 460,
          background:
            "repeating-linear-gradient(90deg, #7a1f24 0 44px, #541217 44px 88px)",
          rotate: "-4deg",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.45)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 280,
          top: -220,
          width: 1360,
          height: 900,
          background:
            "linear-gradient(180deg, rgba(255, 244, 207, 0.13), transparent 72%)",
          clipPath: "polygon(42% 0, 58% 0, 100% 100%, 0 100%)",
          filter: "blur(8px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 320,
          background:
            "radial-gradient(ellipse at 50% 100%, #6b4a2a 0%, #3a2618 45%, #150e0a 100%)",
        }}
      />

      <Confetti count={38} opacity={0.65} />

      {clowns.map((clown, index) => {
        const danceY = Math.sin(frame * 0.2 + index * 1.8) * 10;
        const danceR = Math.sin(frame * 0.16 + index * 1.2) * 4;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: clown.left,
              top: clown.top,
              width: clown.width,
              translate: `0px ${danceY}px`,
              rotate: `${danceR}deg`,
              transformOrigin: "50% 92%",
            }}
          >
            <Clown
              width={clown.width}
              outfit={clown.outfit}
              hair={clown.hair}
              splat={index === 1 && frame >= 46}
            />
          </div>
        );
      })}

      {[
        { p: cakeOne, from: [160, 700], to: [1520, 620], size: 190 },
        { p: cakeTwo, from: [1660, 680], to: [900, 640], size: 210 },
      ].map((cake, index) => {
        const x = interpolate(cake.p, [0, 1], [cake.from[0], cake.to[0]]);
        const y =
          interpolate(cake.p, [0, 1], [cake.from[1], cake.to[1]]) -
          Math.sin(cake.p * Math.PI) * 260;
        const visible = cake.p > 0 && cake.p < 1;
        return visible ? (
          <div
            key={index}
            style={{
              position: "absolute",
              left: x,
              top: y,
              rotate: `${cake.p * 520 + index * 60}deg`,
              filter: "drop-shadow(0 18px 26px rgba(0,0,0,0.4))",
            }}
          >
            <Cake width={cake.size} />
          </div>
        ) : null;
      })}

      {lensCake > 0 && lensCake < 1 ? (
        <div
          style={{
            position: "absolute",
            left: 960,
            top: 900 - lensCake * 400,
            translate: "-50% -50%",
            scale: interpolate(lensCake, [0, 1], [0.5, 4.2], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            rotate: `${lensCake * 180}deg`,
          }}
        >
          <Cake width={170} />
        </div>
      ) : null}

      <AbsoluteFill
        style={{
          translate: `${shake}px 0px`,
          pointerEvents: "none",
        }}
      >
        {splat > 0 ? (
          <svg
            viewBox="0 0 1920 1080"
            width={1920}
            height={1080}
            style={{
              position: "absolute",
              inset: 0,
              scale: interpolate(splat, [0, 1], [0.25, 1.03], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              rotate: "-4deg",
            }}
          >
            <path
              d="M120 210 C210 90 390 130 520 86 C700 20 900 104 1080 70 C1300 30 1510 118 1700 160 C1860 196 1904 342 1840 480 C1902 640 1818 842 1640 902 C1460 964 1280 880 1100 942 C900 1010 720 920 560 962 C360 1012 158 900 120 740 C80 580 40 380 120 210 Z"
              fill="#f7f1e3"
              stroke="#e6dcc8"
              strokeWidth="12"
            />
            <path
              d="M120 210 C210 90 390 130 520 86 C700 20 900 104 1080 70 C1300 30 1510 118 1700 160 C1860 196 1904 342 1840 480 C1902 640 1818 842 1640 902 C1460 964 1280 880 1100 942 C900 1010 720 920 560 962 C360 1012 158 900 120 740 C80 580 40 380 120 210 Z"
              fill="#f7f1e3"
              opacity="0.92"
            />
            {[
              { x: 300, y: 330, color: "#f85149", rotate: 24 },
              { x: 620, y: 250, color: "#58a6ff", rotate: -18 },
              { x: 980, y: 330, color: "#3fb950", rotate: 48 },
              { x: 1320, y: 230, color: "#d29922", rotate: 10 },
              { x: 1620, y: 380, color: "#f85149", rotate: -36 },
              { x: 420, y: 650, color: "#d29922", rotate: 12 },
              { x: 780, y: 720, color: "#58a6ff", rotate: -24 },
              { x: 1160, y: 700, color: "#3fb950", rotate: 52 },
              { x: 1480, y: 640, color: "#f85149", rotate: -8 },
              { x: 900, y: 500, color: "#f0883e", rotate: 30 },
            ].map((sprinkle, index) => (
              <rect
                key={index}
                x={sprinkle.x}
                y={sprinkle.y}
                width="64"
                height="18"
                rx="8"
                fill={sprinkle.color}
                transform={`rotate(${sprinkle.rotate} ${sprinkle.x} ${sprinkle.y})`}
              />
            ))}
            {[
              { x: 520, y: 420, w: 110, h: 70 },
              { x: 1240, y: 500, w: 130, h: 80 },
              { x: 820, y: 840, w: 100, h: 60 },
            ].map((chunk, index) => (
              <rect
                key={index}
                x={chunk.x}
                y={chunk.y}
                width={chunk.w}
                height={chunk.h}
                rx="12"
                fill="#8b5a2b"
                transform={`rotate(${index * 22 - 12} ${chunk.x} ${chunk.y})`}
              />
            ))}
          </svg>
        ) : null}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 48%, transparent 42%, rgba(0,0,0,0.6) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
