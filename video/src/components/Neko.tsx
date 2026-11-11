import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "../lib/theme";

export type NekoMood =
  | "idle"
  | "happy"
  | "sad"
  | "admin"
  | "dead"
  | "wink";

const HEAD = "#12122c";

export const Neko: React.FC<{
  mood?: NekoMood;
  size?: number;
  seed?: number;
  tails?: boolean;
  tailCount?: number;
  talking?: boolean;
  blink?: boolean;
  style?: React.CSSProperties;
  glowAmount?: number;
}> = ({
  mood = "idle",
  size = 180,
  seed = 0,
  tails = true,
  tailCount = 9,
  talking = false,
  blink = true,
  style,
  glowAmount = 1,
}) => {
  const frame = useCurrentFrame();
  const eyeColor =
    mood === "sad" ? "#6b6b9a" : mood === "admin" ? COLORS.amber : COLORS.cyan;
  const line = COLORS.cyan;
  const blinking = blink && (frame + seed * 41) % 128 < 4;
  const mouthOpen = talking ? 1 + Math.abs(Math.sin(frame / 2.4)) * 3 : 0;

  const tailsPaths = Array.from({ length: tailCount }, (_, i) => {
    const k = tailCount === 1 ? 0 : (i - (tailCount - 1) / 2) / ((tailCount - 1) / 2);
    const wobble = Math.sin(frame / 8 + i * 0.85 + seed) * 2.6;
    const sway = Math.sin(frame / 13 + i * 0.5 + seed) * 1.6;
    const endX = 32 + k * 46 + wobble;
    const endY = 8 - Math.abs(k) * 4 + sway;
    const c1x = 32 + k * 24;
    const c1y = 52;
    const c2x = 32 + k * 44;
    const c2y = 22;
    const color =
      i % 3 === 0 ? COLORS.cyan : i % 3 === 1 ? COLORS.violet : COLORS.magenta;
    return { d: `M 32 58 C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`, color, endX, endY, k };
  });

  return (
    <svg
      viewBox="-15 -12 94 82"
      width={size}
      height={(size * 82) / 94}
      shapeRendering="crispEdges"
      style={{
        overflow: "visible",
        filter: `drop-shadow(0 0 ${8 * glowAmount}px ${COLORS.cyan}55)`,
        ...style,
      }}
    >
      <title>Neko-9</title>
      {tails && (
        <g fill="none" strokeLinecap="square">
          {tailsPaths.map((tail, i) => (
            <g key={i}>
              <path
                d={tail.d}
                stroke={tail.color}
                strokeOpacity={0.28 + Math.abs(tail.k) * 0.08}
                strokeWidth={6.4}
              />
              <path
                d={tail.d}
                stroke={tail.color}
                strokeOpacity={0.75}
                strokeWidth={2.2}
              />
              <rect
                x={tail.endX - 2.4}
                y={tail.endY - 2.4}
                width={4.8}
                height={4.8}
                fill={tail.color}
                opacity={0.85}
              />
            </g>
          ))}
        </g>
      )}

      <g>
        <rect x="30" y="1" width="2" height="6" fill={line} opacity="0.7" />
        <rect x="29" y="0" width="4" height="2" fill={COLORS.magenta} opacity="0.9" />

        <rect x="9" y="6" width="13" height="17" fill={HEAD} stroke={line} strokeWidth="1.5" />
        <rect x="42" y="6" width="13" height="17" fill={HEAD} stroke={line} strokeWidth="1.5" />
        <rect x="12" y="10" width="7" height="9" fill={COLORS.magenta} opacity="0.55" />
        <rect x="45" y="10" width="7" height="9" fill={COLORS.magenta} opacity="0.55" />

        <rect x="8" y="18" width="48" height="36" fill={HEAD} stroke={line} strokeWidth="1.5" />
        <rect x="8" y="18" width="48" height="3" fill={COLORS.violet} opacity="0.18" />
        <rect x="28" y="20" width="8" height="2" fill={COLORS.violet} />

        {mood === "dead" ? (
          <g stroke={COLORS.magenta} strokeWidth="2">
            <path d="M18 28 L26 37 M26 28 L18 37" />
            <path d="M38 28 L46 37 M46 28 L38 37" />
          </g>
        ) : mood === "happy" ? (
          <g fill={eyeColor}>
            <rect x="17" y="34" width="3" height="3" />
            <rect x="20" y="31" width="3" height="3" />
            <rect x="23" y="34" width="3" height="3" />
            <rect x="37" y="34" width="3" height="3" />
            <rect x="40" y="31" width="3" height="3" />
            <rect x="43" y="34" width="3" height="3" />
          </g>
        ) : mood === "wink" ? (
          <g>
            <rect x="18" y="28" width="8" height="9" fill={eyeColor} />
            <rect x="22" y="30" width="2" height="6" fill={COLORS.bg0} />
            <rect x="37" y="32" width="9" height="2" fill={eyeColor} />
          </g>
        ) : blinking ? (
          <g fill={eyeColor}>
            <rect x="18" y="32" width="8" height="2" />
            <rect x="38" y="32" width="8" height="2" />
          </g>
        ) : (
          <g>
            <rect x="18" y="28" width="8" height="9" fill={eyeColor} />
            <rect x="38" y="28" width="8" height="9" fill={eyeColor} />
            <rect x="22" y="30" width="2" height="6" fill={COLORS.bg0} />
            <rect x="42" y="30" width="2" height="6" fill={COLORS.bg0} />
            <rect x="18" y="28" width="8" height="1" fill={COLORS.bg0} opacity="0.35" />
            <rect x="38" y="28" width="8" height="1" fill={COLORS.bg0} opacity="0.35" />
          </g>
        )}

        {mood === "sad" && (
          <>
            <rect x="18" y="38" width="2" height="5" fill={COLORS.cyan} opacity="0.7" />
            <rect x="44" y="39" width="2" height="4" fill={COLORS.cyan} opacity="0.5" />
          </>
        )}

        {mood === "admin" && (
          <g fill="none" stroke={COLORS.amber} strokeWidth="1.5">
            <rect x="15" y="27" width="14" height="10" />
            <rect x="35" y="27" width="14" height="10" />
            <rect x="29" y="30" width="6" height="1.5" fill={COLORS.amber} stroke="none" />
          </g>
        )}

        <rect x="13" y="40" width="4" height="3" fill={COLORS.magenta} opacity="0.35" />
        <rect x="47" y="40" width="4" height="3" fill={COLORS.magenta} opacity="0.35" />

        <rect x="30" y="39" width="4" height="3" fill={COLORS.magenta} />

        {mood === "dead" ? (
          <>
            <rect x="31" y="43" width="2" height="6" fill={COLORS.magenta} />
            <rect x="29" y="49" width="6" height="2" fill={COLORS.magenta} />
          </>
        ) : (
          <rect
            x="32"
            y="42"
            width="1.5"
            height={3 + mouthOpen}
            fill={line}
            opacity="0.65"
          />
        )}

        {mood === "happy" || talking ? (
          <g fill={line} opacity="0.75">
            <rect x={27} y={44} width={5} height={1.5} />
            <rect x={32} y={44} width={5} height={1.5} />
            <rect x={27} y={45.5} width={2} height={1.5} />
            <rect x={35} y={45.5} width={2} height={1.5} />
          </g>
        ) : mood === "sad" ? (
          <rect x="28" y="45" width="8" height="1.5" fill={line} opacity="0.4" />
        ) : (
          <rect x="29" y="44" width="6" height="1.5" fill={line} opacity="0.55" />
        )}

        <g fill={line} opacity="0.45">
          <rect x="1" y="37" width="12" height="1" />
          <rect x="3" y="41" width="10" height="1" />
          <rect x="51" y="37" width="12" height="1" />
          <rect x="51" y="41" width="10" height="1" />
        </g>

        <rect x="9" y="50" width="46" height="2" fill={COLORS.violet} opacity="0.2" />
        <rect x="10" y="54" width="10" height="2" fill={line} opacity="0.5" />
        <rect x="44" y="54" width="10" height="2" fill={line} opacity="0.5" />
      </g>
    </svg>
  );
};

export const Halo: React.FC<{ size?: number; y?: number }> = ({
  size = 120,
  y = -34,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: "50%",
        width: size,
        height: size * 0.32,
        transform: `translateX(-50%) rotate(-4deg) scaleY(${0.75 + Math.sin(frame / 10) * 0.08})`,
        border: `5px solid ${COLORS.amber}`,
        borderRadius: "50%",
        boxShadow: `0 0 26px ${COLORS.amber}88, inset 0 0 18px ${COLORS.amber}55`,
        opacity: 0.9,
      }}
    />
  );
};
