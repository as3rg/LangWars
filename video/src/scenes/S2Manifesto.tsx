import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {Neko} from '../components/Neko';
import {Chars, Lines, Strike} from '../components/Type';
import {C, F} from '../theme';
import {inOut, outExpo, seg} from '../lib/anim';

const Dash: React.FC<{frame: number; start: number; end: number; color?: string}> = ({
  frame,
  start,
  end,
  color = C.cyan,
}) => {
  if (frame < start || frame > end) return null;
  const p = seg(frame, start, end);
  const x = -260 + p * 2360;
  const y = 850 + Math.abs(Math.sin(p * Math.PI * 3)) * 26;
  return (
    <div style={{position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none'}}>
      {[3, 2, 1].map((g) => (
        <div
          key={g}
          style={{
            position: 'absolute',
            left: x - g * 52,
            bottom: 1080 - y + g,
            opacity: 0.13 * g,
            rotate: '10deg',
          }}
        >
          <Neko size={112} t={frame - g * 2} mood="idle" tail />
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          left: x,
          bottom: 1080 - y,
          rotate: '10deg',
          filter: `drop-shadow(0 0 22px ${color})`,
        }}
      >
        <Neko size={112} t={frame} mood="happy" />
      </div>
      <div
        style={{
          position: 'absolute',
          left: x + 78,
          bottom: 1080 - y + 42,
          width: 230,
          height: 4,
          background: `linear-gradient(90deg, ${color}, transparent)`,
          boxShadow: `0 0 14px ${color}`,
        }}
      />
    </div>
  );
};

const Flash: React.FC<{frame: number; at: number; color: string; length?: number}> = ({
  frame,
  at,
  color,
  length = 5,
}) => {
  const local = frame - at;
  if (local < 0 || local > length) return null;
  const p = 1 - local / length;
  return (
    <AbsoluteFill
      style={{
        background: color,
        opacity: p * 0.9,
        mixBlendMode: 'screen',
        zIndex: 30,
      }}
    />
  );
};

const StatementOne: React.FC<{f: number}> = ({f}) => (
  <AbsoluteFill>
    <Backdrop accent={C.cyan} glow={C.violet} />
    <div
      style={{
        position: 'absolute',
        right: -80,
        top: 90,
        width: 900,
        height: 900,
        opacity: 0.5,
      }}
    >
      {[0, 1, 2, 3].map((ring) => (
        <div
          key={ring}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 300 + ring * 150,
            height: 300 + ring * 150,
            translate: '-50% -50%',
            border: `1px solid ${ring % 2 ? C.violet : C.cyan}44`,
            borderRadius: 999,
            rotate: `${f * (0.3 + ring * 0.12)}deg`,
          }}
        />
      ))}
      {['answer', 'total', 'greeting', 'mirror', 'score', 'ready'].map((name, index) => {
        const angle = (index / 6) * Math.PI * 2 + f * 0.025;
        return (
          <div
            key={name}
            style={{
              position: 'absolute',
              left: `calc(50% + ${Math.cos(angle) * 330}px)`,
              top: `calc(50% + ${Math.sin(angle) * 330}px)`,
              translate: '-50% -50%',
              fontFamily: F.mono,
              fontSize: 17,
              color: index % 2 ? C.cyan : C.pale,
              opacity: 0.65,
              padding: '5px 10px',
              border: `1px solid ${C.line}`,
              background: '#0a0a1acc',
              borderRadius: 5,
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </div>
        );
      })}
    </div>

    <div style={{position: 'absolute', left: 116, top: 214}}>
      <Lines
        lines={['ОДИН', 'МИР.']}
        size={246}
        start={2}
        stagger={5}
        lineHeight={0.86}
        gradient={`linear-gradient(100deg, ${C.cyan}, ${C.violet} 58%, ${C.magenta})`}
      />
      <div
        style={{
          marginTop: 34,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          opacity: outExpo(seg(f, 16, 30)),
          translate: `0px ${(1 - outExpo(seg(f, 16, 30))) * 18}px`,
        }}
      >
        <span style={{width: 52, height: 2, background: C.cyan}} />
        <span
          style={{
            fontFamily: F.mono,
            fontSize: 23,
            letterSpacing: '0.16em',
            color: C.pale,
            textTransform: 'uppercase',
          }}
        >
          одно пространство имён
        </span>
      </div>
    </div>
  </AbsoluteFill>
);

const StatementTwo: React.FC<{f: number}> = ({f}) => {
  const chips = [
    {name: 'answer', value: '50', x: 1210, y: 236, tone: C.magenta},
    {name: 'total_score', value: '51', x: 1430, y: 392, tone: C.cyan},
    {name: 'greeting', value: '"nya"', x: 1190, y: 552, tone: C.violet},
    {name: 'last_winner', value: '"v0id"', x: 1450, y: 702, tone: C.amber},
  ];
  const update = outExpo(seg(f, 24, 38));
  return (
    <AbsoluteFill>
      <Backdrop accent={C.violet} glow={C.cyan} />
      {chips.map((chip, index) => {
        const enter = outExpo(seg(f, index * 3, 12 + index * 3));
        const floated = Math.sin((f + index * 18) * 0.05) * 8;
        return (
          <div
            key={chip.name}
            style={{
              position: 'absolute',
              left: chip.x,
              top: chip.y + floated,
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              background: 'linear-gradient(150deg, #12122ccc, #070714dd)',
              boxShadow: `0 18px 50px #0009, 0 0 30px ${chip.tone}18`,
              overflow: 'hidden',
              opacity: enter,
              translate: `${(1 - enter) * 60}px 0px`,
            }}
          >
            <span
              style={{
                padding: '13px 18px',
                fontFamily: F.mono,
                fontSize: 22,
                color: C.pale,
                borderRight: `1px solid ${C.lineSoft}`,
              }}
            >
              {chip.name}
            </span>
            <span
              style={{
                padding: '13px 18px',
                fontFamily: F.mono,
                fontSize: 22,
                color: chip.tone,
                minWidth: 90,
                textAlign: 'right',
              }}
            >
              {index === 0 && update > 0.4 ? '100' : chip.value}
            </span>
          </div>
        );
      })}

      <div style={{position: 'absolute', left: 116, top: 250}}>
        <Lines
          lines={['ОБЩИЕ', 'ИМЕНА.']}
          size={202}
          start={1}
          stagger={5}
          lineHeight={0.88}
          gradient={`linear-gradient(100deg, ${C.cyan}, ${C.violet})`}
        />
        <div
          style={{
            marginTop: 32,
            width: 470,
            height: 2,
            background: `linear-gradient(90deg, ${C.cyan}, transparent)`,
            opacity: outExpo(seg(f, 12, 24)),
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const StatementThree: React.FC<{f: number}> = ({f}) => {
  const strike = inOut(seg(f, 22, 34));
  const glitch = f > 18 && f < 40 ? 4 : 1;
  return (
    <AbsoluteFill>
      <Backdrop accent={C.magenta} glow={C.magenta} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `repeating-linear-gradient(90deg, transparent 0 190px, ${C.magenta}08 190px 191px)`,
          opacity: 0.7,
        }}
      />
      <div style={{position: 'absolute', left: 110, top: 178}}>
        <Chars
          text="ЧУЖОЙ КОД"
          size={156}
          start={0}
          stagger={1.6}
          duration={12}
          color={C.text}
          glitch={glitch}
          lineHeight={0.9}
        />
        <div style={{position: 'relative', marginTop: 6}}>
          <Chars
            text="ЛОМАЕТ ТВОЙ."
            size={156}
            start={6}
            stagger={1.4}
            duration={12}
            color={C.magenta}
            glitch={glitch}
            lineHeight={0.9}
          />
          <Strike progress={strike} color={C.white} height={12} style={{top: '46%'}} />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 130,
          bottom: 150,
          width: 480,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '18px 22px',
          border: `1px solid ${C.magenta}55`,
          background: '#0a0a1acc',
          opacity: outExpo(seg(f, 8, 20)),
          translate: `0px ${(1 - outExpo(seg(f, 8, 20))) * 26}px`,
          rotate: '-2deg',
        }}
      >
        <span style={{fontFamily: F.mono, fontSize: 15, color: C.dim}}>beta</span>
        <span style={{fontFamily: F.mono, fontSize: 25, color: C.pale, whiteSpace: 'nowrap'}}>
          <span style={{color: '#ff7ab6'}}>let</span>{' '}
          <span style={{color: C.magenta, borderBottom: `2px solid ${C.magenta}`}}>answer</span>{' '}
          <span style={{color: '#8d8db4'}}>=</span>{' '}
          <span style={{color: '#ffb86b'}}>100</span>
        </span>
      </div>
    </AbsoluteFill>
  );
};

const StatementFour: React.FC<{f: number}> = ({f}) => {
  return (
    <AbsoluteFill>
      <Backdrop variant="white" grid={false} particles={false} />
      <div
        style={{
          position: 'absolute',
          right: -260,
          top: -300,
          width: 1100,
          height: 1100,
          borderRadius: 999,
          background: `radial-gradient(circle, ${C.magenta} 0%, ${C.magenta}00 68%)`,
          opacity: 0.75,
          scale: 0.8 + outExpo(seg(f, 0, 22)) * 0.3,
        }}
      />
      <div style={{position: 'absolute', left: 110, top: 180}}>
        <Chars
          text="ЭТО"
          size={190}
          start={0}
          stagger={2}
          duration={10}
          color={C.bg}
          lineHeight={0.9}
        />
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 24}}>
          <Chars
            text="ФИЧА."
            size={280}
            start={5}
            stagger={2}
            duration={12}
            color={C.bg}
            lineHeight={0.86}
          />
          <div
            style={{
              width: 26,
              height: 190,
              background: C.magenta,
              marginBottom: 28,
              opacity: outExpo(seg(f, 12, 24)),
              boxShadow: `0 0 30px ${C.magenta}66`,
            }}
          />
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 90,
          bottom: 80,
          opacity: outExpo(seg(f, 4, 18)),
          scale: 0.7 + outExpo(seg(f, 4, 18)) * 0.3,
          rotate: '-8deg',
        }}
      >
        <Neko size={250} mood="happy" t={f} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 118,
          bottom: 120,
          display: 'flex',
          gap: 10,
          opacity: outExpo(seg(f, 18, 30)),
        }}
      >
        {['shared', 'mutable', 'alive'].map((word) => (
          <span
            key={word}
            style={{
              fontFamily: F.mono,
              fontSize: 16,
              letterSpacing: '0.14em',
              padding: '6px 12px',
              border: `1px solid ${C.bg}`,
              color: C.bg,
              textTransform: 'uppercase',
            }}
          >
            {word}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const S2Manifesto: React.FC = () => {
  const frame = useCurrentFrame();
  const local = frame;

  return (
    <AbsoluteFill>
      {local < 52 && <StatementOne f={local} />}
      {local >= 52 && local < 104 && <StatementTwo f={local - 52} />}
      {local >= 104 && local < 160 && <StatementThree f={local - 104} />}
      {local >= 160 && <StatementFour f={local - 160} />}

      <Dash frame={local} start={38} end={56} color={C.cyan} />
      <Dash frame={local} start={90} end={108} color={C.violet} />
      <Dash frame={local} start={146} end={164} color={C.magenta} />
      <Dash frame={local} start={196} end={210} color={C.amber} />

      <Flash frame={local} at={50} color={C.white} />
      <Flash frame={local} at={102} color={C.violet} />
      <Flash frame={local} at={158} color={C.magenta} />
    </AbsoluteFill>
  );
};
