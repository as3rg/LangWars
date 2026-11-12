import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F} from '../theme';

const Corner: React.FC<{x: number; y: number; flipX?: boolean; flipY?: boolean}> = ({
  x,
  y,
  flipX,
  flipY,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 38,
      height: 38,
      borderLeft: `${flipX ? 0 : 2}px solid rgba(232,232,255,.28)`,
      borderRight: `${flipX ? 2 : 0}px solid rgba(232,232,255,.28)`,
      borderTop: `${flipY ? 0 : 2}px solid rgba(232,232,255,.28)`,
      borderBottom: `${flipY ? 2 : 0}px solid rgba(232,232,255,.28)`,
    }}
  />
);

export const ScreenFrame: React.FC<{label?: string; revision?: number}> = ({
  label = 'LANGWARS // LWLANG ARENA',
  revision = 128,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const progress = Math.min(1, frame / Math.max(1, durationInFrames - 1));

  return (
    <AbsoluteFill style={{pointerEvents: 'none', zIndex: 100}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,.17) 3px, rgba(0,0,0,0) 4px)',
          opacity: 0.48,
          mixBlendMode: 'multiply',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,0,.46) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(255,46,136,.06), transparent 12%, transparent 88%, rgba(15,241,202,.06))',
        }}
      />

      <Corner x={34} y={34} />
      <Corner x={1886} y={34} flipX />
      <Corner x={34} y={1008} flipY />
      <Corner x={1886} y={1008} flipX flipY />

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          background: 'rgba(255,255,255,.08)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${C.cyan}, ${C.violet}, ${C.magenta})`,
            boxShadow: `0 0 16px ${C.cyan}88`,
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 54,
          bottom: 40,
          fontFamily: F.mono,
          fontSize: 11,
          letterSpacing: '0.2em',
          color: '#fff',
          opacity: 0.55,
          mixBlendMode: 'difference',
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: 'absolute',
          right: 62,
          bottom: 40,
          fontFamily: F.mono,
          fontSize: 11,
          letterSpacing: '0.2em',
          color: '#fff',
          opacity: 0.55,
          mixBlendMode: 'difference',
        }}
      >
        REV {revision}
      </div>
    </AbsoluteFill>
  );
};
