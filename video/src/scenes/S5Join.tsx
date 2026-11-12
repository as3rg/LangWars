import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {Neko} from '../components/Neko';
import {Chars, Lines} from '../components/Type';
import {Pill, QrCode} from '../components/ui';
import {C, F} from '../theme';
import {AUTHORS, JOIN_URL, JOIN_URL_HINT} from '../content';
import {outExpo, seg} from '../lib/anim';

const Bracket: React.FC<{x: number; y: number; flipX?: boolean; flipY?: boolean; color: string}> = ({
  x,
  y,
  flipX,
  flipY,
  color,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 54,
      height: 54,
      borderLeft: `${flipX ? 0 : 2}px solid ${color}`,
      borderRight: `${flipX ? 2 : 0}px solid ${color}`,
      borderTop: `${flipY ? 0 : 2}px solid ${color}`,
      borderBottom: `${flipY ? 2 : 0}px solid ${color}`,
      boxShadow: `0 0 18px ${color}44`,
    }}
  />
);

export const S5Join: React.FC = () => {
  const frame = useCurrentFrame();

  const first = 1 - seg(frame, 36, 48);
  const second = outExpo(seg(frame, 42, 56)) * (1 - seg(frame, 132, 146));
  const claim = outExpo(seg(frame, 136, 154));
  const qrIn = outExpo(seg(frame, 52, 70));
  const linkIn = outExpo(seg(frame, 74, 88));
  const credits = outExpo(seg(frame, 212, 226));
  const endFade = seg(frame, 318, 334);

  const brandIn = outExpo(seg(frame, 230, 244));

  return (
    <AbsoluteFill>
      <Backdrop accent={C.cyan} glow={C.magenta} />

      <div
        style={{
          position: 'absolute',
          right: 180,
          top: 120,
          width: 760,
          height: 760,
          borderRadius: 999,
          background: `radial-gradient(circle, ${C.cyan}20, transparent 64%)`,
          opacity: qrIn,
        }}
      />

      {first > 0.01 && (
        <div
          style={{
            position: 'absolute',
            left: 110,
            top: 210,
            opacity: first,
            translate: `0px ${(1 - first) * -40}px`,
          }}
        >
          <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
            <Chars
              text="ХВАТИТ"
              size={220}
              start={0}
              stagger={2}
              duration={12}
              lineHeight={0.9}
              color={C.text}
            />
            <Chars
              text="СМОТРЕТЬ."
              size={220}
              start={3}
              stagger={1.6}
              duration={12}
              lineHeight={0.9}
              color={C.magenta}
            />
          </div>
        </div>
      )}

      {second > 0.01 && (
        <div
          style={{
            position: 'absolute',
            left: 110,
            top: 220,
            opacity: second,
            translate: `0px ${(1 - second) * 36}px`,
          }}
        >
          <Lines
            lines={['ЗАХОДИ', 'В ОБЩИЙ', 'МИР.']}
            size={188}
            start={0}
            stagger={3}
            lineHeight={0.9}
            gradient={`linear-gradient(100deg, ${C.cyan}, ${C.violet} 56%, ${C.magenta})`}
          />
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 190,
          opacity: claim,
          translate: `0px ${(1 - claim) * 44}px`,
        }}
      >
        <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
          {[
            {text: 'ТЕСТИРУЙ.', color: C.cyan},
            {text: 'ЛОМАЙ.', color: C.magenta},
            {text: 'ВЫЖИВАЙ.', color: C.amber},
          ].map((line, index) => (
            <Chars
              key={line.text}
              text={line.text}
              size={index === 2 ? 142 : 150}
              color={line.color}
              start={index * 3}
              stagger={1}
              duration={12}
              lineHeight={0.92}
            />
          ))}
        </div>

        <div
          style={{
            marginTop: 36,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            opacity: credits,
          }}
        >
          <span style={{fontFamily: F.mono, fontSize: 11, letterSpacing: '0.22em', color: C.dim}}>СДЕЛАЛИ</span>
          <span style={{display: 'flex', gap: 12, flexWrap: 'wrap'}}>
            {AUTHORS.map((author) => (
              <span key={author} style={{fontFamily: F.mono, fontSize: 14, color: C.muted}}>
                @{author}
              </span>
            ))}
          </span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 138,
          top: 238,
          opacity: qrIn,
          scale: 0.92 + qrIn * 0.08,
          translate: `0px ${(1 - qrIn) * 40}px`,
        }}
      >
        <div style={{position: 'relative', width: 460, height: 460, padding: 14}}>
          <QrCode size={432} />
          <Bracket x={-10} y={-10} color={C.cyan} />
          <Bracket x={438} y={-10} flipX color={C.cyan} />
          <Bracket x={-10} y={438} flipY color={C.cyan} />
          <Bracket x={438} y={438} flipX flipY color={C.cyan} />
        </div>

        <div
          style={{
            marginTop: 44,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            opacity: linkIn,
            translate: `0px ${(1 - linkIn) * 20}px`,
          }}
        >
          <a
            href={`https://${JOIN_URL}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 22px',
              border: `1px solid ${C.cyan}55`,
              background: `${C.cyan}0d`,
              boxShadow: `0 0 30px ${C.cyan}22`,
              fontFamily: F.mono,
              fontSize: 25,
              color: C.cyan,
              letterSpacing: '0.01em',
              textDecoration: 'none',
            }}
          >
            <span>https://{JOIN_URL_HINT}</span>
            <span
              style={{
                width: 2,
                height: 28,
                background: Math.floor(frame / 12) % 2 === 0 ? C.cyan : 'transparent',
              }}
            />
          </a>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 610,
          bottom: 230,
          rotate: '-8deg',
          opacity: qrIn,
          translate: `${Math.sin(frame * 0.08) * 6}px 0px`,
        }}
      >
        <Neko size={190} mood="happy" t={frame} look={0.3} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          opacity: brandIn,
          translate: `0px ${(1 - brandIn) * -16}px`,
        }}
      >
        <span style={{fontFamily: F.pixel, fontSize: 24, color: C.cyan, letterSpacing: '0.04em', textShadow: `0 0 22px ${C.cyan}55`}}>
          LANGWARS
        </span>
        <Pill tone="violet">LWLANG v0.3</Pill>
        <Pill tone="cyan">ОБЩИЙ МИР</Pill>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 110,
          bottom: 74,
          display: 'flex',
          gap: 26,
          fontFamily: F.mono,
          fontSize: 12,
          letterSpacing: '0.18em',
          color: C.dim,
          textTransform: 'uppercase',
          opacity: credits * 0.8,
        }}
      >
        <span>один мир</span>
        <span style={{color: C.cyan}}>/</span>
        <span>одно пространство</span>
        <span style={{color: C.magenta}}>/</span>
        <span>твой ход</span>
      </div>

      <AbsoluteFill
        style={{
          background: '#050510',
          opacity: endFade,
          zIndex: 50,
        }}
      />
    </AbsoluteFill>
  );
};
