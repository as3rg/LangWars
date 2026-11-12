import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C} from '../theme';
import {rand} from '../lib/anim';

type Props = {
  accent?: string;
  variant?: 'dark' | 'solid' | 'white';
  glow?: string;
  grid?: boolean;
  particles?: boolean;
};

export const Backdrop: React.FC<Props> = ({
  accent = C.cyan,
  variant = 'dark',
  glow,
  grid = true,
  particles = true,
}) => {
  const frame = useCurrentFrame();
  const solid = variant === 'solid';
  const white = variant === 'white';

  const dots = useMemo(
    () =>
      Array.from({length: 46}, (_, i) => ({
        x: rand(i * 1.7) * 100,
        y: rand(i * 3.1 + 9) * 100,
        size: 1 + rand(i * 5.3) * 2.6,
        speed: 0.006 + rand(i * 7.9) * 0.022,
        phase: rand(i * 9.2) * 100,
        tone: i % 5,
      })),
    [],
  );

  const gridOffset = (frame * 0.45) % 64;
  const floorOffset = (frame * 1.4) % 72;

  return (
    <AbsoluteFill
      style={{
        background: white
          ? C.white
          : solid
            ? accent
            : `radial-gradient(1000px 700px at 78% 6%, ${glow ?? accent}22, transparent 62%),
               radial-gradient(900px 700px at 8% 96%, ${C.violet}18, transparent 60%),
               radial-gradient(1100px 800px at 50% 118%, ${C.magenta}12, transparent 65%),
               ${C.bg}`,
        overflow: 'hidden',
      }}
    >
      {grid && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: -80,
              backgroundImage: `linear-gradient(${solid || white ? 'rgba(5,5,16,.13)' : 'rgba(15,241,202,.055)'} 1px, transparent 1px), linear-gradient(90deg, ${solid || white ? 'rgba(5,5,16,.13)' : 'rgba(15,241,202,.055)'} 1px, transparent 1px)`,
              backgroundSize: '64px 64px',
              backgroundPosition: `0px ${gridOffset}px`,
              maskImage: 'radial-gradient(ellipse at 50% 42%, black 20%, transparent 78%)',
              opacity: solid ? 0.55 : 0.8,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '-25%',
              right: '-25%',
              bottom: '-24%',
              height: '58%',
              backgroundImage: `linear-gradient(${solid || white ? 'rgba(5,5,16,.35)' : 'rgba(138,92,246,.28)'} 1px, transparent 1px), linear-gradient(90deg, ${solid || white ? 'rgba(5,5,16,.35)' : 'rgba(138,92,246,.28)'} 1px, transparent 1px)`,
              backgroundSize: '72px 72px',
              backgroundPosition: `0px ${floorOffset}px`,
              transform: 'perspective(520px) rotateX(63deg)',
              transformOrigin: 'bottom',
              maskImage: 'linear-gradient(to top, black, transparent 80%)',
              opacity: solid ? 0.5 : 0.55,
            }}
          />
        </>
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: solid
            ? `radial-gradient(1000px 550px at 72% 18%, rgba(255,255,255,.2), transparent 65%), radial-gradient(900px 700px at 10% 100%, rgba(0,0,0,.24), transparent 65%)`
            : undefined,
        }}
      />

      {particles &&
        dots.map((dot, index) => {
          const y = ((dot.y + frame * dot.speed * 100) % 110) - 5;
          const x = dot.x + Math.sin(frame * 0.008 + dot.phase) * 1.4;
          const tone = [C.cyan, C.violet, C.magenta, C.amber, C.white][dot.tone];
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                width: dot.size,
                height: dot.size,
                borderRadius: 1,
                background: solid || white ? 'rgba(5,5,16,.45)' : tone,
                opacity: solid || white ? 0.32 : 0.35 + rand(index) * 0.4,
                boxShadow: solid || white ? 'none' : `0 0 8px ${tone}`,
              }}
            />
          );
        })}

      <div
        style={{
          position: 'absolute',
          right: '-15%',
          top: '-35%',
          width: '70%',
          height: '100%',
          background: `conic-gradient(from ${frame * 0.12}deg at 50% 50%, transparent 0deg, ${solid || white ? 'rgba(255,255,255,.2)' : `${accent}14`} 40deg, transparent 120deg)`,
          filter: 'blur(30px)',
          opacity: 0.7,
        }}
      />
    </AbsoluteFill>
  );
};
