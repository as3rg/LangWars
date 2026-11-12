import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C} from '../theme';

export type Mood = 'idle' | 'happy' | 'sad' | 'shock' | 'admin';

type Props = {
  mood?: Mood;
  size?: number;
  t?: number;
  look?: number;
  glow?: boolean;
  style?: React.CSSProperties;
  tail?: boolean;
};

const HEAD = '#12122c';
const LINE = '#0ff1ca';

/**
 * Neko-9 — the platform mascot. Rebuilt from the frontend SVG so the video
 * and the product speak the same visual language.
 */
export const Neko: React.FC<Props> = ({
  mood = 'idle',
  size = 240,
  t,
  look = 0,
  glow = true,
  style,
  tail = true,
}) => {
  const local = useCurrentFrame();
  const frame = t ?? local;

  const bob = Math.sin(frame * 0.09) * 3.5;
  const tilt = Math.sin(frame * 0.045) * 1.4;
  const antenna = Math.sin(frame * 0.13) * 2.2;

  const phase = frame % 107;
  const blink = mood === 'happy' || mood === 'shock'
    ? 0
    : Math.max(0, 1 - Math.abs(phase - 2.5) / 2.5);

  const eyeColor = mood === 'sad' ? '#6b6b9a' : mood === 'admin' ? C.amber : mood === 'shock' ? C.magenta : C.cyan;
  const eyeH = mood === 'shock' ? 11 : mood === 'sad' ? 7 : 9;
  const pupil = look * 1.6;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        filter: glow ? `drop-shadow(0 0 ${size * 0.09}px rgba(15,241,202,.4))` : undefined,
        ...style,
      }}
    >
      <svg
        viewBox="0 0 72 68"
        width="100%"
        height="100%"
        shapeRendering="crispEdges"
        overflow="visible"
        style={{
          translate: `0px ${bob}px`,
          rotate: `${tilt}deg`,
          overflow: 'visible',
        }}
      >
        {tail && (
          <g
            fill={LINE}
            opacity={0.55}
            style={{
              transformOrigin: '55px 50px',
              rotate: `${Math.sin(frame * 0.1) * 11}deg`,
            }}
          >
            <rect x="55" y="48" width="6" height="3" />
            <rect x="59" y="45" width="5" height="3" />
            <rect x="63" y="41" width="4" height="3" />
            <rect x="65" y="36" width="3" height="4" />
            <rect x="64" y="31" width="3" height="4" opacity={0.75} />
          </g>
        )}

        <g>
          <rect
            x="31"
            y="1"
            width="2"
            height="6"
            fill={LINE}
            opacity="0.7"
            style={{translate: `${antenna}px 0px`}}
          />
          <rect
            x="29.5"
            y="-1"
            width="5"
            height="2.5"
            fill={C.magenta}
            opacity="0.95"
            style={{translate: `${antenna}px 0px`}}
          />

          <rect x="9" y="6" width="13" height="17" fill={HEAD} stroke={LINE} strokeWidth="1.5" />
          <rect x="42" y="6" width="13" height="17" fill={HEAD} stroke={LINE} strokeWidth="1.5" />
          <rect x="12" y="10" width="7" height="9" fill={C.magenta} opacity="0.55" />
          <rect x="45" y="10" width="7" height="9" fill={C.magenta} opacity="0.55" />

          <rect x="8" y="18" width="48" height="36" fill={HEAD} stroke={LINE} strokeWidth="1.5" />
          <rect x="8" y="18" width="48" height="3" fill={C.violet} opacity="0.22" />
          <rect x="28" y="20" width="8" height="2" fill={C.violet} />

          {mood === 'happy' ? (
            <g fill={eyeColor}>
              <rect x="18" y="33" width="3" height="3" />
              <rect x="21" y="30" width="3" height="3" />
              <rect x="24" y="33" width="3" height="3" />
              <rect x="37" y="33" width="3" height="3" />
              <rect x="40" y="30" width="3" height="3" />
              <rect x="43" y="33" width="3" height="3" />
            </g>
          ) : mood === 'admin' ? (
            <g>
              <rect x="15" y="28" width="34" height="9" fill="#050510" stroke={C.amber} strokeWidth="1.5" />
              <rect x="18" y="31" width="9" height="3" fill={C.amber} opacity="0.8" />
              <rect x="37" y="31" width="9" height="3" fill={C.amber} opacity="0.8" />
            </g>
          ) : (
            <g>
              <rect
                x="18"
                y={28 + (eyeH * (1 - blink)) / 2}
                width={mood === 'shock' ? 10 : 8}
                height={eyeH * (1 - blink * 0.92)}
                fill={eyeColor}
              />
              <rect
                x="38"
                y={28 + (eyeH * (1 - blink)) / 2}
                width={mood === 'shock' ? 10 : 8}
                height={eyeH * (1 - blink * 0.92)}
                fill={eyeColor}
              />
              <rect
                x={21 + pupil}
                y={29.5 + (eyeH * blink) / 2}
                width={mood === 'shock' ? 3 : 2}
                height={mood === 'shock' ? 7 : 6}
                fill="#050510"
                opacity={blink > 0.7 ? 0 : 1}
              />
              <rect
                x={41 + pupil}
                y={29.5 + (eyeH * blink) / 2}
                width={mood === 'shock' ? 3 : 2}
                height={mood === 'shock' ? 7 : 6}
                fill="#050510"
                opacity={blink > 0.7 ? 0 : 1}
              />
              <rect x="18" y="28" width="8" height="1" fill="#050510" opacity="0.35" />
              <rect x="38" y="28" width="8" height="1" fill="#050510" opacity="0.35" />
            </g>
          )}

          {mood === 'sad' && (
            <g fill={LINE}>
              <rect x="18" y="38" width="2" height="6" opacity="0.75" />
              <rect x="21" y="42" width="2" height="4" opacity="0.45" />
            </g>
          )}
          {mood === 'shock' && (
            <g>
              <rect x="29" y="43" width="6" height="6" fill="#050510" stroke={C.magenta} strokeWidth="1.2" />
              <rect x="13" y="40" width="3" height="5" fill={C.magenta} opacity="0.7" />
            </g>
          )}

          <rect x="13" y="40" width="4" height="3" fill={C.magenta} opacity="0.35" />
          <rect x="47" y="40" width="4" height="3" fill={C.magenta} opacity="0.35" />

          <rect x="30" y="39" width="4" height="3" fill={C.magenta} />
          <rect x="32" y="42" width="1.5" height="3" fill={LINE} opacity="0.65" />
          {mood === 'happy' ? (
            <g fill={LINE} opacity="0.75">
              <rect x="26" y="44" width="6" height="1.5" />
              <rect x="32" y="44" width="6" height="1.5" />
              <rect x="26" y="45.5" width="2" height="1.5" />
              <rect x="36" y="45.5" width="2" height="1.5" />
            </g>
          ) : mood === 'sad' ? (
            <g fill={LINE} opacity="0.55">
              <rect x="28" y="46" width="8" height="1.5" />
              <rect x="28" y="44" width="2" height="1.5" />
              <rect x="34" y="44" width="2" height="1.5" />
            </g>
          ) : (
            <g fill={LINE} opacity="0.55">
              <rect x="28" y="44" width="8" height="1.5" />
            </g>
          )}

          <g fill={LINE} opacity="0.45">
            <rect x="1" y="37" width="12" height="1" />
            <rect x="3" y="41" width="10" height="1" />
            <rect x="51" y="37" width="9" height="1" />
            <rect x="51" y="41" width="7" height="1" />
          </g>

          <rect x="9" y="50" width="46" height="2" fill={C.violet} opacity="0.22" />
          <rect x="10" y="54" width="10" height="2" fill={LINE} opacity="0.5" />
          <rect x="44" y="54" width="10" height="2" fill={LINE} opacity="0.5" />
        </g>
      </svg>
    </div>
  );
};
