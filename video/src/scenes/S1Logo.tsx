import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {Neko} from '../components/Neko';
import {Chars} from '../components/Type';
import {Pill} from '../components/ui';
import {C, F} from '../theme';
import {AUTHORS} from '../content';
import {outExpo, seg} from '../lib/anim';

export const S1Logo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const boot = outExpo(seg(frame, 0, 10));
  const sub = outExpo(seg(frame, 26, 44));
  const credit = outExpo(seg(frame, 58, 76));
  const exit = seg(frame, 104, 120);

  const mascotIn = spring({
    frame: frame - 34,
    fps,
    config: {damping: 13, stiffness: 140, mass: 0.9},
  });

  const lineWidth = interpolate(boot, [0, 1], [0, 920]);
  const wordScale = interpolate(seg(frame, 0, 30), [0, 1], [1.14, 1]);
  const wordBlur = interpolate(seg(frame, 0, 18), [0, 1], [16, 0]);

  return (
    <AbsoluteFill>
      <Backdrop accent={C.cyan} glow={C.magenta} />

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 64,
          display: 'flex',
          justifyContent: 'center',
          opacity: boot,
          gap: 18,
        }}
      >
        <Pill tone="violet">LWLANG v0.3</Pill>
        <Pill tone="cyan">ОБЩИЙ МИР</Pill>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 26,
          top: 200,
          opacity: mascotIn,
          scale: interpolate(mascotIn, [0, 1], [0.25, 1], {output: 'perceptual-scale'}),
          rotate: `${interpolate(mascotIn, [0, 1], [-18, 0])}deg`,
          translate: `${exit * 560}px ${exit * -140}px`,
          zIndex: 0,
        }}
      >
        <Neko size={380} mood={frame > 86 ? 'happy' : 'idle'} t={frame} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 326,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          scale: wordScale,
          filter: `blur(${wordBlur}px)`,
          opacity: boot,
          translate: `0px ${exit * -40}px`,
          zIndex: 1,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center'}}>
          <Chars
            text="LANG"
            size={148}
            font={F.pixel}
            weight={400}
            letterSpacing="0.02em"
            stagger={2.2}
            duration={15}
            start={4}
            color={C.cyan}
            distance={46}
            glitch={frame < 24 ? 2.4 : 0}
            style={{textShadow: `0 0 34px ${C.cyan}66`}}
          />
          <Chars
            text="WARS"
            size={148}
            font={F.pixel}
            weight={400}
            letterSpacing="0.02em"
            stagger={2.2}
            duration={15}
            start={11}
            color={C.magenta}
            distance={46}
            glitch={frame < 24 ? 2.4 : 0}
            style={{textShadow: `0 0 34px ${C.magenta}66`, marginLeft: 14}}
          />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 512,
          translate: '-50% 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          opacity: sub,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
          <span
            style={{
              width: lineWidth,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${C.cyan})`,
            }}
          />
          <span
            style={{
              fontFamily: F.mono,
              fontSize: 24,
              letterSpacing: '0.42em',
              color: C.text,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            LWLANG ARENA
          </span>
          <span
            style={{
              width: lineWidth,
              height: 1,
              background: `linear-gradient(90deg, ${C.cyan}, transparent)`,
            }}
          />
        </div>
        <div
          style={{
            fontFamily: F.body,
            fontSize: 22,
            letterSpacing: '0.04em',
            color: C.muted,
            opacity: 0.8,
          }}
        >
          Одна программа. Один общий мир.
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 110,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 18,
          opacity: credit,
          translate: `0px ${(1 - credit) * 24}px`,
        }}
      >
        <span
          style={{
            fontFamily: F.mono,
            fontSize: 12,
            letterSpacing: '0.24em',
            color: C.dim,
            textTransform: 'uppercase',
          }}
        >
          сделали
        </span>
        <span style={{display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap'}}>
          {AUTHORS.map((author, index) => {
            const item = outExpo(seg(frame, 58 + index * 3, 68 + index * 3));
            return (
              <span
                key={author}
                style={{
                  fontFamily: F.mono,
                  fontSize: 18,
                  color: index === 0 ? C.cyan : C.pale,
                  opacity: item,
                  translate: `0px ${(1 - item) * 12}px`,
                  letterSpacing: '0.02em',
                }}
              >
                @{author}
                {index < AUTHORS.length - 1 && (
                  <span style={{color: C.dim, marginLeft: 14}}>·</span>
                )}
              </span>
            );
          })}
        </span>
      </div>

      <AbsoluteFill
        style={{
          background: `linear-gradient(90deg, transparent ${60 - exit * 30}%, ${C.magenta}${exit > 0.05 ? 'aa' : '00'} 100%)`,
          opacity: exit,
          mixBlendMode: 'screen',
        }}
      />
    </AbsoluteFill>
  );
};
