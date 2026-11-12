import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {Neko} from '../components/Neko';
import {Chars, Kicker} from '../components/Type';
import {Avatar, Code, MiniBar, Pill, Window} from '../components/ui';
import {C, F} from '../theme';
import {NAMES, PLAYERS, outExpo, rand, scramble, seg} from '../lib/anim';

const BeatShell: React.FC<{
  f: number;
  dur: number;
  bg: React.ReactNode;
  children: React.ReactNode;
  z?: number;
}> = ({f, dur, bg, children, z = 1}) => {
  const enter = outExpo(seg(f, 0, 5));
  const exit = seg(f, dur - 4, dur);
  return (
    <AbsoluteFill style={{overflow: 'hidden', zIndex: z}}>
      {bg}
      <AbsoluteFill
        style={{
          opacity: 1,
          scale: 1.025 - enter * 0.025 + exit * 0.035,
          translate: `0px ${(1 - enter) * 26}px`,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Title: React.FC<{
  text: string;
  size?: number;
  color?: string;
  gradient?: string;
  outline?: boolean;
  align?: 'left' | 'right';
  style?: React.CSSProperties;
}> = ({text, size = 180, color = C.text, gradient, outline, align = 'left', style}) => (
  <div
    style={{
      fontFamily: F.display,
      fontSize: size,
      fontWeight: 800,
      letterSpacing: '-0.055em',
      lineHeight: 0.88,
      textTransform: 'uppercase',
      textAlign: align,
      color: outline ? 'transparent' : gradient ? 'transparent' : color,
      WebkitTextStroke: outline ? `2px ${color}` : undefined,
      backgroundImage: gradient,
      backgroundClip: gradient ? 'text' : undefined,
      WebkitBackgroundClip: gradient ? 'text' : undefined,
      filter: gradient ? `drop-shadow(0 0 28px ${color}22)` : undefined,
      ...style,
    }}
  >
    {text}
  </div>
);

/* -------------------------------------------------- intro */

const IntroBeat: React.FC<{f: number; dur: number}> = ({f, dur}) => {
  const zoom = interpolate(seg(f, 0, 10), [0, 1], [0.7, 1]);
  return (
    <BeatShell
      f={f}
      dur={dur}
      bg={<Backdrop accent={C.cyan} glow={C.magenta} />}
    >
      <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center'}}>
        <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 20, scale: zoom}}>
          <Title
            text="АРЕНА."
            size={286}
            gradient={`linear-gradient(100deg, ${C.cyan}, ${C.violet} 48%, ${C.magenta})`}
          />
          <div style={{translate: '0px -90px', rotate: '8deg'}}>
            <Neko size={230} mood="happy" t={f} />
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 96,
          display: 'flex',
          justifyContent: 'center',
          gap: 22,
          fontFamily: F.mono,
          fontSize: 15,
          letterSpacing: '0.24em',
          color: C.dim,
          textTransform: 'uppercase',
        }}
      >
        <span>LWLANG</span>
        <span style={{color: C.cyan}}>/</span>
        <span>общее состояние</span>
        <span style={{color: C.cyan}}>/</span>
        <span>v0.3</span>
      </div>
    </BeatShell>
  );
};

/* -------------------------------------------------- world */

const WorldBeat: React.FC<{f: number; dur: number}> = ({f, dur}) => {
  const rev = f > 34 ? 128 : 127;
  const value = f > 34 ? '100' : '50';
  const pulse = f > 34 ? Math.max(0, 1 - (f - 34) / 12) : 0;
  const rows = [
    {name: 'answer', value, owner: 'beta', hot: f > 34},
    {name: 'total_score', value: '51', owner: 'alpha'},
    {name: 'greeting', value: '"nya"', owner: 'v0id'},
    {name: 'scores', value: '[7, 42, 9]', owner: 'nyaa'},
    {name: 'last_winner', value: '"v0id"', owner: 'nullbyte'},
    {name: 'mirror', value: '1', owner: 'redshift'},
  ];

  return (
    <BeatShell f={f} dur={dur} bg={<Backdrop accent={C.cyan} glow={C.violet} />}>
      <div style={{position: 'absolute', left: 96, top: 48}}>
        <Title
          text="ОБЩИЙ МИР"
          size={178}
          gradient={`linear-gradient(100deg, ${C.cyan}, ${C.violet} 62%, ${C.magenta})`}
        />
        <Kicker start={4} color={C.cyan} style={{marginTop: 8}}>
          одно пространство имён
        </Kicker>
      </div>

      <div style={{position: 'absolute', left: 160, top: 340, width: 1600, height: 640}}>
        <Window
          title="namespace"
          accent={C.cyan}
          right={
            <span style={{display: 'flex', gap: 10, alignItems: 'center'}}>
              <Pill tone="cyan">REV {rev}</Pill>
              <Pill tone="violet">СИНХРО</Pill>
            </span>
          }
          style={{height: '100%'}}
          bodyStyle={{padding: '0 24px 12px'}}
        >
          <div
            style={{
              display: 'flex',
              gap: 26,
              borderBottom: `1px solid ${C.lineSoft}`,
              padding: '0 2px',
              height: 52,
              alignItems: 'center',
              fontFamily: F.mono,
              fontSize: 15,
              letterSpacing: '0.08em',
            }}
          >
            <span style={{color: C.cyan, borderBottom: `2px solid ${C.cyan}`, height: '100%', display: 'flex', alignItems: 'center'}}>
              ИМЕНА
            </span>
            <span style={{color: C.dim}}>ФУНКЦИИ</span>
            <span style={{marginLeft: 'auto', color: C.dim}}>6 / 6</span>
          </div>

          {rows.map((row, index) => {
            const enter = outExpo(seg(f, 5 + index * 1.4, 12 + index * 1.4));
            return (
              <div
                key={row.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.25fr 1fr 0.7fr',
                  alignItems: 'center',
                  height: 82,
                  borderBottom: `1px solid ${C.lineSoft}`,
                  opacity: enter,
                  translate: `${(1 - enter) * 30}px 0px`,
                  background: row.hot ? `linear-gradient(90deg, ${C.magenta}12, transparent 70%)` : undefined,
                  boxShadow: row.hot && pulse > 0 ? `inset 3px 0 ${C.magenta}` : undefined,
                }}
              >
                <span style={{display: 'flex', alignItems: 'center', gap: 12, fontFamily: F.mono, fontSize: 26, color: C.pale}}>
                  {row.name}
                  {row.hot && <span style={{fontFamily: F.mono, fontSize: 11, color: C.magenta, letterSpacing: '0.1em'}}>ОБНОВЛЕНО</span>}
                </span>
                <span
                  style={{
                    fontFamily: F.mono,
                    fontSize: 26,
                    color: row.hot ? C.magenta : C.cyan,
                    textShadow: row.hot ? `0 0 16px ${C.magenta}55` : undefined,
                  }}
                >
                  {row.value}
                </span>
                <span style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8}}>
                  <Avatar name={row.owner} size={22} />
                  <span style={{fontFamily: F.mono, fontSize: 13, color: C.dim}}>{row.owner}</span>
                </span>
              </div>
            );
          })}
        </Window>
      </div>

      <div
        style={{
          position: 'absolute',
          right: -40,
          top: 120,
          fontFamily: F.display,
          fontSize: 330,
          fontWeight: 900,
          color: 'transparent',
          WebkitTextStroke: `1px ${C.cyan}22`,
          letterSpacing: '-0.08em',
          opacity: 0.6,
        }}
      >
        STATE
      </div>
    </BeatShell>
  );
};

/* -------------------------------------------------- rating */

const RatingBeat: React.FC<{f: number; dur: number}> = ({f, dur}) => (
  <BeatShell f={f} dur={dur} bg={<Backdrop accent={C.amber} glow={C.amber} />}>
    <div style={{position: 'absolute', right: 96, top: 82, textAlign: 'right'}}>
      <Title text="РЕЙТИНГ" size={196} color={C.amber} />
    </div>

    <div style={{position: 'absolute', left: 150, top: 360, width: 1620, height: 640}}>
      <Window
        title="рейтинг"
        accent={C.amber}
        right={<Pill tone="amber">ВСЕ ЗАДАЧИ</Pill>}
        style={{height: '100%'}}
        bodyStyle={{padding: '0 22px'}}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '90px 1fr 180px 120px 220px',
            gap: 12,
            alignItems: 'center',
            height: 48,
            borderBottom: `1px solid ${C.lineSoft}`,
            fontFamily: F.mono,
            fontSize: 12,
            letterSpacing: '0.1em',
            color: C.dim,
            textTransform: 'uppercase',
          }}
        >
          <span>место</span>
          <span>игрок</span>
          <span style={{textAlign: 'right'}}>очки</span>
          <span style={{textAlign: 'right'}}>Δ</span>
          <span />
        </div>

        {PLAYERS.map((player, index) => {
          const enter = outExpo(seg(f, 4 + index * 1.5, 12 + index * 1.5));
          const top = index === 0;
          return (
            <div
              key={player.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr 180px 120px 220px',
                gap: 12,
                alignItems: 'center',
                height: 102,
                borderBottom: `1px solid ${C.lineSoft}`,
                opacity: enter,
                translate: `${(1 - enter) * 40}px 0px`,
                background: top ? `linear-gradient(90deg, ${C.amber}12, transparent 74%)` : undefined,
                boxShadow: top ? `inset 3px 0 ${C.amber}` : undefined,
              }}
            >
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: top ? 34 : 22,
                  color: top ? C.amber : C.dim,
                  textShadow: top ? `0 0 20px ${C.amber}66` : undefined,
                  paddingLeft: 10,
                }}
              >
                {index + 1}
              </span>
              <span style={{display: 'flex', alignItems: 'center', gap: 13}}>
                <Avatar name={player.name} size={top ? 38 : 30} />
                <span style={{fontFamily: F.mono, fontSize: top ? 27 : 23, color: top ? C.text : C.pale}}>
                  {player.name}
                </span>
                {top && <Pill tone="amber">#1</Pill>}
              </span>
              <span
                style={{
                  textAlign: 'right',
                  fontFamily: F.mono,
                  fontSize: top ? 34 : 27,
                  color: top ? C.amber : C.cyan,
                  fontWeight: 700,
                }}
              >
                {player.score}
              </span>
              <span
                style={{
                  textAlign: 'right',
                  fontFamily: F.mono,
                  fontSize: 16,
                  color: player.delta >= 0 ? C.cyan : C.magenta,
                }}
              >
                {player.delta >= 0 ? `+${player.delta}` : player.delta}
              </span>
              <MiniBar
                value={player.score / 2000}
                color={top ? C.amber : C.cyan}
                width={200}
              />
            </div>
          );
        })}
      </Window>
    </div>
  </BeatShell>
);

/* -------------------------------------------------- language */

const LanguageBeat: React.FC<{f: number; dur: number}> = ({f, dur}) => {
  const annotations = ['@get', '@set', '@cast', '@truthy', '@length'];
  return (
    <BeatShell f={f} dur={dur} bg={<Backdrop accent={C.violet} variant="solid" glow={C.violet} />}>
      <div style={{position: 'absolute', left: 96, top: 70}}>
        <Title text="ЯЗЫК" size={186} color={C.bg} />
        <Title text="МЕНЯЕТСЯ" size={110} color={C.bg} style={{marginTop: 6}} />
        <div
          style={{
            marginTop: 26,
            fontFamily: F.mono,
            fontSize: 19,
            letterSpacing: '0.16em',
            color: '#2b0d5c',
            textTransform: 'uppercase',
            opacity: outExpo(seg(f, 6, 16)),
          }}
        >
          стандартная библиотека — часть мира
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: -40,
          bottom: -60,
          fontFamily: F.display,
          fontSize: 420,
          fontWeight: 900,
          color: 'transparent',
          WebkitTextStroke: `2px #ffffff28`,
          letterSpacing: '-0.08em',
          rotate: '-6deg',
        }}
      >
        @eq
      </div>

      <div style={{position: 'absolute', right: 120, top: 236, width: 880}}>
        <Window
          title="world/eq.lws"
          accent={C.violet}
          right={<Pill tone="violet">ПЕРЕОПРЕДЕЛЕНИЕ</Pill>}
          style={{boxShadow: `0 30px 100px #1c0746aa`}}
          bodyStyle={{padding: '30px 30px 34px'}}
          footer={
            <span style={{display: 'flex', alignItems: 'center', gap: 12}}>
              <span style={{color: C.cyan}}>✓</span> контракт принят
              <span style={{marginLeft: 'auto', color: C.dim}}>lang/eq</span>
            </span>
          }
        >
          <Code
            code={`@eq\nfn <list, list> same(left, right) {\n  return __builtin_eq__(left, right);\n}`}
            size={30}
            lineNumbers
            highlights={[0]}
            highlightColor={C.amber}
          />
        </Window>

        {annotations.map((annotation, index) => {
          const enter = outExpo(seg(f, 5 + index * 1.5, 12 + index * 1.5));
          const positions = [
            {left: -152, top: 146},
            {left: -152, top: 276},
            {left: -152, top: 406},
            {left: -20, top: 520},
            {left: 700, top: 550},
          ];
          return (
            <div
              key={annotation}
              style={{
                position: 'absolute',
                ...positions[index],
                fontFamily: F.mono,
                fontSize: 22,
                color: C.pale,
                border: `1px solid #ffffff33`,
                background: '#120729cc',
                padding: '8px 14px',
                opacity: enter,
                translate: `0px ${(1 - enter) * 20 + Math.sin((f + index * 20) * 0.06) * 7}px`,
                rotate: `${index % 2 ? 3 : -3}deg`,
              }}
            >
              {annotation}
            </div>
          );
        })}
      </div>
    </BeatShell>
  );
};

/* -------------------------------------------------- recheck */

const RecheckBeat: React.FC<{f: number; dur: number}> = ({f, dur}) => {
  const cells = NAMES.slice(0, 12);
  return (
    <BeatShell f={f} dur={dur} bg={<Backdrop accent={C.magenta} variant="solid" glow={C.magenta} />}>
      <div style={{position: 'absolute', left: 90, top: 90}}>
        <Title text="ПЕРЕПРОВЕРКА" size={126} color={C.bg} />
        <div
          style={{
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontFamily: F.mono,
            fontSize: 18,
            letterSpacing: '0.18em',
            color: '#5a0026',
            textTransform: 'uppercase',
          }}
        >
          <span style={{width: 10, height: 10, borderRadius: 99, background: C.bg, boxShadow: `0 0 12px ${C.bg}`}} />
          изменение имени → пересчёт
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 70,
          top: 90,
          fontFamily: F.display,
          fontSize: 360,
          fontWeight: 900,
          color: '#ffffff16',
          letterSpacing: '-0.09em',
          lineHeight: 0.8,
        }}
      >
        REV
      </div>

      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 380,
          width: 1280,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 18,
        }}
      >
        {cells.map((name, index) => {
          const flipAt = 8 + index * 1.2;
          const broken = f >= flipAt;
          const enter = outExpo(seg(f, 3 + index * 0.6, 9 + index * 0.6));
          return (
            <div
              key={name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                minHeight: 112,
                padding: '22px 18px',
                background: '#0a0a1a',
                border: `1px solid ${broken ? C.magenta : C.line}`,
                borderLeft: `3px solid ${broken ? C.magenta : C.cyan}`,
                opacity: enter,
                translate: `0px ${(1 - enter) * 18}px`,
                boxShadow: broken ? `0 0 26px ${C.magenta}22` : undefined,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background: broken ? C.magenta : C.cyan,
                  boxShadow: `0 0 10px ${broken ? C.magenta : C.cyan}`,
                }}
              />
              <span style={{fontFamily: F.mono, fontSize: 18, color: C.pale}}>{name}</span>
              <span style={{marginLeft: 'auto', fontFamily: F.mono, fontSize: 12, color: broken ? C.magenta : C.dim}}>
                {broken ? 'СБОЙ' : 'ОК'}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          right: 150,
          bottom: 132,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: 999,
            border: `2px dashed ${C.bg}`,
            display: 'grid',
            placeItems: 'center',
            rotate: `${f * 4}deg`,
            opacity: 0.8,
          }}
        >
          <span style={{rotate: `${-f * 4}deg`, fontFamily: F.mono, fontSize: 20, color: C.bg}}>
            {Math.max(0, 128 - Math.round(seg(f, 10, 40) * 128))}
          </span>
        </div>
        <div style={{fontFamily: F.mono, fontSize: 16, letterSpacing: '0.16em', color: '#5a0026', textTransform: 'uppercase'}}>
          идёт
          <br />
          перепроверка
        </div>
      </div>
    </BeatShell>
  );
};

/* -------------------------------------------------- events */

const EventsBeat: React.FC<{f: number; dur: number}> = ({f, dur}) => {
  const seconds = 3 * 3600 + 12 * 60 + 44 - Math.floor(f / 2);
  const clock = `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return (
    <BeatShell f={f} dur={dur} bg={<Backdrop accent={C.amber} glow={C.amber} />}>
      <div style={{position: 'absolute', left: 92, top: 80}}>
        <Title text="ИВЕНТЫ" size={204} color={C.amber} />
        <Kicker start={4} color={C.amber} style={{marginTop: 6}}>
          ограниченные миры
        </Kicker>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 500,
          top: 350,
          width: 1160,
          height: 470,
          border: `1px solid ${C.amber}66`,
          background: 'linear-gradient(140deg, #171023, #0a0a1a)',
          boxShadow: `0 30px 100px #0008, 0 0 90px ${C.amber}22`,
          padding: '36px 42px',
          rotate: '-1.4deg',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <Pill tone="amber">ИВЕНТ</Pill>
          <span style={{fontFamily: F.mono, fontSize: 14, color: C.amber, letterSpacing: '0.16em'}}>03 / 07 / 12</span>
        </div>
        <div
          style={{
            marginTop: 26,
            fontFamily: F.display,
            fontSize: 74,
            fontWeight: 800,
            letterSpacing: '-0.045em',
            color: C.text,
            lineHeight: 1,
          }}
        >
          ОСОБЫЙ МИР
        </div>
        <div
          style={{
            marginTop: 16,
            fontFamily: F.mono,
            fontSize: 16,
            color: C.muted,
            letterSpacing: '0.06em',
          }}
        >
          отдельная таблица · собственные правила
        </div>
        <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 40}}>
          <div
            style={{
              fontFamily: F.mono,
              fontSize: 78,
              color: C.amber,
              letterSpacing: '0.02em',
              lineHeight: 1,
              textShadow: `0 0 34px ${C.amber}44`,
            }}
          >
            {clock}
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 0}}>
            {['v0id', 'nyaa', 'nullbyte', 'redshift'].map((name, index) => (
              <Avatar
                key={name}
                name={name}
                size={40}
                style={{marginLeft: index === 0 ? 0 : -10, border: `2px solid #0a0a1a`}}
              />
            ))}
            <span style={{marginLeft: 14, fontFamily: F.mono, fontSize: 16, color: C.muted}}>+128</span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 42,
            right: 42,
            bottom: 34,
            height: 6,
            background: '#ffffff0e',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${58 + Math.sin(f * 0.08) * 3}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${C.amber}, ${C.magenta})`,
              boxShadow: `0 0 18px ${C.amber}66`,
            }}
          />
        </div>
      </div>

      {[0, 1, 2, 3, 4, 5, 6].map((index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: 300 + rand(index * 3) * 1300,
            top: 270 + rand(index * 7) * 520,
            width: 6,
            height: 6,
            background: index % 2 ? C.amber : C.magenta,
            opacity: 0.5 + rand(index) * 0.4,
            boxShadow: `0 0 12px ${index % 2 ? C.amber : C.magenta}`,
          }}
        />
      ))}
    </BeatShell>
  );
};

/* -------------------------------------------------- tasks */

const TasksBeat: React.FC<{f: number; dur: number}> = ({f, dur}) => (
  <BeatShell f={f} dur={dur} bg={<Backdrop accent={C.cyan} variant="solid" glow={C.cyan} />}>
    <div style={{position: 'absolute', left: 92, top: 88}}>
      <Title text="ЗАДАЧИ" size={212} color={C.bg} />
    </div>

    <div style={{position: 'absolute', left: 150, top: 300, width: 1620, height: 660}}>
      <Window
        title="задача / shared_sum"
        accent={C.cyan}
        right={<Pill tone="cyan">6 / 6</Pill>}
        style={{height: '100%'}}
        bodyStyle={{display: 'grid', gridTemplateColumns: '0.94fr 1.06fr', height: 612}}
      >
        <div style={{padding: '32px 36px', borderRight: `1px solid ${C.lineSoft}`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
            <Pill tone="cyan">ОБЩИЕ ИМЕНА</Pill>
            <Pill tone="amber">СРЕДНЕ</Pill>
          </div>
          <div
            style={{
              marginTop: 22,
              fontFamily: F.display,
              fontSize: 58,
              fontWeight: 800,
              letterSpacing: '-0.045em',
              color: C.text,
              lineHeight: 1.02,
            }}
          >
            СУММА
          </div>
          <p style={{margin: '22px 0 0', fontFamily: F.body, fontSize: 22, lineHeight: 1.55, color: C.muted}}>
            Верни <span style={{fontFamily: F.mono, color: C.cyan}}>left + right</span>. Имена и функции здесь общие:
            решение публикует их в мир.
          </p>
          <div
            style={{
              marginTop: 34,
              padding: '18px 20px',
              border: `1px dashed ${C.line}`,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontFamily: F.mono,
              fontSize: 19,
              color: C.pale,
            }}
          >
            <span style={{color: C.dim}}>sum(2, 3)</span>
            <span style={{color: C.cyan}}>→</span>
            <span style={{color: C.cyan}}>5</span>
          </div>
          <div style={{marginTop: 34, display: 'flex', gap: 8}}>
            {['#1', '#2', '#3'].map((name) => (
              <span
                key={name}
                style={{
                  fontFamily: F.mono,
                  fontSize: 12,
                  color: C.dim,
                  border: `1px solid ${C.line}`,
                  padding: '5px 9px',
                  borderRadius: 5,
                }}
              >
                {name} ✓
              </span>
            ))}
          </div>
        </div>

        <div style={{padding: '28px 30px', display: 'flex', flexDirection: 'column', gap: 20}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
            <span style={{width: 9, height: 9, borderRadius: 99, background: '#ff5f7a'}} />
            <span style={{width: 9, height: 9, borderRadius: 99, background: C.amber}} />
            <span style={{width: 9, height: 9, borderRadius: 99, background: C.cyan}} />
            <span style={{marginLeft: 12, fontFamily: F.mono, fontSize: 13, color: C.dim}}>solution.lws</span>
            <Pill tone="violet" style={{marginLeft: 'auto'}}>V0.3</Pill>
          </div>
          <Code
            code={`@solution\nfn <int, int> sum(left, right) {\n  return left + right;\n}`}
            size={27}
            lineNumbers
            style={{flex: 1, paddingTop: 6}}
          />
          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <Pill tone="ok">✓ 6 / 6</Pill>
            <span style={{fontFamily: F.mono, fontSize: 13, color: C.dim}}>0.04 s</span>
            <span
              style={{
                marginLeft: 'auto',
                fontFamily: F.mono,
                fontSize: 16,
                color: C.bg,
                background: C.cyan,
                padding: '10px 20px',
                borderRadius: 8,
                fontWeight: 700,
                boxShadow: `0 0 24px ${C.cyan}44`,
              }}
            >
              ОТПРАВИТЬ →
            </span>
          </div>
        </div>
      </Window>
    </div>
  </BeatShell>
);

/* -------------------------------------------------- publish */

const PublishBeat: React.FC<{f: number; dur: number}> = ({f, dur}) => {
  const names = [
    {name: 'answer', value: '100', y: 300, delay: 7},
    {name: 'sum', value: 'fn', y: 420, delay: 11},
    {name: 'mirror', value: '"nya"', y: 540, delay: 15},
  ];
  return (
    <BeatShell f={f} dur={dur} bg={<Backdrop accent={C.violet} glow={C.violet} />}>
      <div style={{position: 'absolute', left: 92, top: 76}}>
        <Title text="ПУБЛИКАЦИЯ" size={158} color={C.text} />
        <Kicker start={3} color={C.violet} style={{marginTop: 8}}>
          код становится частью мира
        </Kicker>
      </div>

      <div style={{position: 'absolute', left: 120, top: 350, width: 760}}>
        <Window
          title="solution.lws"
          accent={C.violet}
          right={<Pill tone="violet">ОТПРАВИТЬ</Pill>}
          bodyStyle={{padding: '26px 28px'}}
          footer={
            <span style={{display: 'flex', alignItems: 'center', gap: 12, width: '100%'}}>
              <span style={{color: C.cyan}}>✓ 6 / 6</span>
              <span style={{marginLeft: 'auto', color: C.cyan}}>опубликовано</span>
            </span>
          }
        >
          <Code
            code={`@solution\nfn <int, int> sum(left, right) {\n  return left + right;\n}\n\nlet answer = 100;`}
            size={26}
            lineNumbers
          />
          <div
            style={{
              marginTop: 22,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: `${C.violet}14`,
              border: `1px solid ${C.violet}55`,
              borderRadius: 8,
              fontFamily: F.mono,
              fontSize: 14,
              color: '#b39bff',
            }}
          >
            <span style={{width: 9, height: 9, borderRadius: 99, background: C.violet, boxShadow: `0 0 10px ${C.violet}`}} />
            публикация имён в общий namespace
          </div>
        </Window>
      </div>

      <div style={{position: 'absolute', right: 110, top: 350, width: 720}}>
        <Window title="namespace" accent={C.cyan} right={<Pill tone="cyan">REV 128</Pill>}>
          {names.map((row, index) => {
            const arrive = outExpo(seg(f, row.delay + 8, row.delay + 16));
            return (
              <div
                key={row.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: 88,
                  padding: '0 22px',
                  borderBottom: index < names.length - 1 ? `1px solid ${C.lineSoft}` : undefined,
                  background: arrive > 0.3 ? `linear-gradient(90deg, ${C.cyan}0e, transparent 70%)` : undefined,
                }}
              >
                <span style={{fontFamily: F.mono, fontSize: 25, color: C.pale}}>{row.name}</span>
                <span style={{marginLeft: 'auto', fontFamily: F.mono, fontSize: 24, color: arrive > 0.3 ? C.cyan : C.dim}}>
                  {arrive > 0.3 ? row.value : '—'}
                </span>
              </div>
            );
          })}
          <div style={{padding: '18px 22px', fontFamily: F.mono, fontSize: 12, letterSpacing: '0.12em', color: C.dim}}>
            + 3 НОВЫХ ИМЕНИ
          </div>
        </Window>
      </div>

      {names.map((row, index) => {
        const t = seg(f, row.delay, row.delay + 10);
        if (t <= 0 || t >= 1) return null;
        const x = 800 + t * 300;
        const y = 640 + (row.y - 640) * t - Math.sin(t * Math.PI) * 80;
        return (
          <div
            key={row.name}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              fontFamily: F.mono,
              fontSize: 20,
              color: index === 0 ? C.cyan : C.pale,
              border: `1px solid ${index === 0 ? C.cyan : C.violet}88`,
              background: '#0a0a1a',
              padding: '9px 14px',
              boxShadow: `0 0 26px ${index === 0 ? C.cyan : C.violet}33`,
              opacity: Math.min(1, t * 4),
              scale: 0.8 + t * 0.2,
              zIndex: 20,
            }}
          >
            {row.name}
          </div>
        );
      })}
    </BeatShell>
  );
};

/* -------------------------------------------------- submissions */

const SubmissionsBeat: React.FC<{f: number; dur: number}> = ({f, dur}) => {
  const rows = [
    {name: 'alpha', status: 'ОК', score: '6 / 6', impact: '—', tone: 'ok' as const},
    {name: 'beta', status: 'СЛОМАНО', score: '0 / 6', impact: '−4', tone: 'bad' as const},
    {name: 'v0id', status: 'ОК', score: '6 / 6', impact: '—', tone: 'ok' as const},
    {name: 'nyaa', status: 'ПРОВЕРКА', score: '…', impact: '−2', tone: 'amber' as const},
    {name: 'nullbyte', status: 'ОК', score: '6 / 6', impact: '—', tone: 'ok' as const},
  ];
  return (
    <BeatShell f={f} dur={dur} bg={<Backdrop accent={C.magenta} glow={C.violet} />}>
      <div style={{position: 'absolute', right: 90, top: 76, textAlign: 'right'}}>
        <Title text="САБМИТЫ" size={190} color={C.text} />
      </div>

      <div style={{position: 'absolute', left: 130, top: 350, width: 1660, height: 610}}>
        <Window
          title="сабмиты"
          accent={C.magenta}
          right={<Pill tone="magenta">ОНЛАЙН</Pill>}
          style={{height: '100%'}}
          bodyStyle={{padding: '0 22px'}}
        >
          {rows.map((row, index) => {
            const enter = outExpo(seg(f, 4 + index * 1.6, 12 + index * 1.6));
            return (
              <div
                key={row.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 0.8fr 0.7fr 0.7fr',
                  gap: 14,
                  alignItems: 'center',
                  height: 104,
                  padding: '0 14px',
                  borderBottom: `1px solid ${C.lineSoft}`,
                  opacity: enter,
                  translate: `${(1 - enter) * 28}px 0px`,
                  background: index === 1 ? `linear-gradient(90deg, ${C.magenta}10, transparent 72%)` : undefined,
                }}
              >
                <span style={{display: 'flex', alignItems: 'center', gap: 13}}>
                  <Avatar name={row.name} size={34} />
                  <span style={{fontFamily: F.mono, fontSize: 23, color: C.pale}}>{row.name}</span>
                  <span style={{fontFamily: F.mono, fontSize: 12, color: C.dim}}>#{120 + index * 7}</span>
                </span>
                <Pill tone={row.tone} style={{justifySelf: 'start'}}>{row.status}</Pill>
                <span style={{fontFamily: F.mono, fontSize: 19, color: C.muted, textAlign: 'right'}}>{row.score}</span>
                <span
                  style={{
                    justifySelf: 'end',
                    fontFamily: F.mono,
                    fontSize: 15,
                    color: row.impact === '—' ? C.dim : '#b39bff',
                    border: row.impact === '—' ? 'none' : `1px solid ${C.violet}55`,
                    background: row.impact === '—' ? 'transparent' : `${C.violet}12`,
                    padding: row.impact === '—' ? 0 : '5px 10px',
                  }}
                >
                  {row.impact === '—' ? '' : `сломал ${row.impact.replace('−', '')}`}
                </span>
              </div>
            );
          })}
        </Window>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 96,
          bottom: 74,
          width: 520,
          padding: '20px 22px',
          border: `1px solid ${C.magenta}66`,
          background: 'linear-gradient(120deg, #1a0a1a, #0a0a1a)',
          boxShadow: `0 24px 70px #0009, 0 0 60px ${C.magenta}22`,
          opacity: outExpo(seg(f, 16, 24)),
          translate: `${(1 - outExpo(seg(f, 16, 24))) * 40}px 0px`,
          zIndex: 20,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <span style={{fontFamily: F.mono, fontSize: 12, color: C.magenta, letterSpacing: '0.16em'}}>NEKO-9</span>
          <span style={{marginLeft: 'auto', fontFamily: F.mono, fontSize: 11, color: C.dim}}>now</span>
        </div>
        <div style={{marginTop: 8, fontFamily: F.body, fontSize: 20, color: C.text, lineHeight: 1.4}}>
          твоё решение сломано. <span style={{color: C.magenta}}>снова.</span>
        </div>
      </div>
    </BeatShell>
  );
};

/* -------------------------------------------------- guide */

const GuideBeat: React.FC<{f: number; dur: number}> = ({f, dur}) => {
  const cards = [
    {expr: '5 / 0', result: '42'},
    {expr: 'get("lwlang", -1)', result: '"g"'},
    {expr: '1000001', result: '-1000000'},
  ];
  return (
    <BeatShell f={f} dur={dur} bg={<Backdrop accent={C.cyan} glow={C.cyan} />}>
      <div style={{position: 'absolute', left: 92, top: 76}}>
        <Title text="ГАЙД" size={216} gradient={`linear-gradient(100deg, ${C.cyan}, ${C.violet})`} />
        <Kicker start={3} color={C.cyan} style={{marginTop: 8}}>
          странный язык — честные правила
        </Kicker>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 120,
          right: 120,
          top: 420,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 28,
        }}
      >
        {cards.map((card, index) => {
          const enter = outExpo(seg(f, 4 + index * 2, 12 + index * 2));
          return (
            <div
              key={card.expr}
              style={{
                height: 320,
                border: `1px solid ${C.line}`,
                background: 'linear-gradient(160deg, #101028, #070714)',
                padding: '30px 30px',
                opacity: enter,
                translate: `0px ${(1 - enter) * 44}px`,
                boxShadow: `0 24px 70px #0008, inset 0 1px ${C.cyan}33`,
              }}
            >
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 27,
                  color: C.pale,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {card.expr}
              </div>
              <div style={{marginTop: 10, width: 44, height: 2, background: C.cyan}} />
              <div
                style={{
                  marginTop: 48,
                  fontFamily: F.display,
                  fontSize: card.result.length > 6 ? 58 : 74,
                  fontWeight: 800,
                  letterSpacing: '-0.05em',
                  color: C.cyan,
                  textShadow: `0 0 30px ${C.cyan}44`,
                  whiteSpace: 'nowrap',
                }}
              >
                {card.result}
              </div>
            </div>
          );
        })}
      </div>
    </BeatShell>
  );
};

/* -------------------------------------------------- admin */

const AdminBeat: React.FC<{f: number; dur: number}> = ({f, dur}) => {
  const rows = [
    {label: 'ИМЕНА', values: ['ПУБЛИЧНО', 'СКРЫТО'], active: 0},
    {label: 'ЗНАЧЕНИЯ', values: ['ПУБЛИЧНО', 'СКРЫТО'], active: 1},
    {label: 'ФУНКЦИИ', values: ['ПУБЛИЧНО', 'СКРЫТО'], active: 0},
  ];
  return (
    <BeatShell f={f} dur={dur} bg={<Backdrop accent={C.amber} glow={C.amber} />}>
      <div style={{position: 'absolute', right: 92, top: 76, textAlign: 'right'}}>
        <Title text="АДМИН" size={208} color={C.amber} />
      </div>

      <div style={{position: 'absolute', left: 210, top: 360, width: 1500}}>
        <Window title="админ" accent={C.amber} right={<Pill tone="amber">ROOT</Pill>} bodyStyle={{padding: '10px 28px'}}>
          {rows.map((row, index) => {
            const flipAt = 12 + index * 5;
            const active = f > flipAt ? (row.active + 1) % 2 : row.active;
            return (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  height: 108,
                  borderBottom: index < rows.length - 1 ? `1px solid ${C.lineSoft}` : undefined,
                }}
              >
                <span style={{fontFamily: F.mono, fontSize: 24, color: C.pale, width: 190}}>{row.label}</span>
                <div style={{display: 'flex', gap: 8}}>
                  {row.values.map((value, valueIndex) => (
                    <span
                      key={value}
                      style={{
                        fontFamily: F.mono,
                        fontSize: 13,
                        letterSpacing: '0.08em',
                        padding: '8px 14px',
                        border: `1px solid ${active === valueIndex ? C.amber : C.line}`,
                        background: active === valueIndex ? `${C.amber}18` : 'transparent',
                        color: active === valueIndex ? C.amber : C.dim,
                      }}
                    >
                      {value}
                    </span>
                  ))}
                </div>
                <span
                  style={{
                    marginLeft: 'auto',
                    width: 64,
                    height: 30,
                    borderRadius: 99,
                    border: `1px solid ${C.line}`,
                    background: '#050510',
                    padding: 3,
                    display: 'flex',
                    justifyContent: active === 0 ? 'flex-end' : 'flex-start',
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 99,
                      background: active === 0 ? C.cyan : C.magenta,
                      boxShadow: `0 0 12px ${active === 0 ? C.cyan : C.magenta}`,
                    }}
                  />
                </span>
              </div>
            );
          })}
        </Window>

        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 22, fontFamily: F.mono, fontSize: 13, color: C.dim}}>
          <span>ссылка-приглашение · 24ч</span>
          <span style={{color: C.amber}}>langwars.example/join#••••</span>
        </div>
      </div>
    </BeatShell>
  );
};

/* -------------------------------------------------- news */

const NewsBeat: React.FC<{f: number; dur: number}> = ({f, dur}) => (
  <BeatShell f={f} dur={dur} bg={<Backdrop accent={C.magenta} glow={C.magenta} />}>
    <div style={{position: 'absolute', left: 92, top: 76}}>
      <Title text="НОВОСТИ" size={196} color={C.magenta} />
    </div>

    <div style={{position: 'absolute', left: 150, top: 380, width: 1620, display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 26}}>
      {[
        {tag: 'ЯЗЫК', title: 'ПЕРЕОПРЕДЕЛЕНИЕ @EQ', body: 'мир принял новую реализацию равенства', accent: C.violet},
        {tag: 'МИР', title: 'REV 128', body: 'состояние обновлено · 6 решений перепроверено', accent: C.cyan},
      ].map((card, index) => {
        const enter = outExpo(seg(f, 4 + index * 3, 12 + index * 3));
        return (
          <div
            key={card.title}
            style={{
              border: `1px solid ${card.accent}55`,
              borderLeft: `4px solid ${card.accent}`,
              background: 'linear-gradient(150deg, #14142a, #080814)',
              padding: '34px 36px',
              minHeight: 390,
              opacity: enter,
              translate: `0px ${(1 - enter) * 38}px`,
              boxShadow: `0 26px 80px #0008`,
            }}
          >
            <Pill tone={index === 0 ? 'violet' : 'cyan'}>{card.tag}</Pill>
            <div
              style={{
                marginTop: 28,
                fontFamily: F.display,
                fontSize: 48,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: C.text,
                lineHeight: 1.05,
              }}
            >
              {card.title}
            </div>
            <div style={{marginTop: 20, fontFamily: F.body, fontSize: 21, color: C.muted, lineHeight: 1.5}}>
              {card.body}
            </div>
            <div style={{marginTop: 46, display: 'flex', alignItems: 'center', gap: 9, fontFamily: F.mono, fontSize: 13, color: card.accent}}>
              ЧИТАТЬ →
            </div>
          </div>
        );
      })}
    </div>
  </BeatShell>
);

/* -------------------------------------------------- revision */

const RevisionBeat: React.FC<{f: number; dur: number}> = ({f, dur}) => {
  const rev = Math.min(128, 126 + Math.floor(seg(f, 4, 20) * 3));
  return (
    <BeatShell f={f} dur={dur} bg={<Backdrop accent={C.cyan} glow={C.violet} />}>
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{fontFamily: F.mono, fontSize: 30, letterSpacing: '0.5em', color: C.cyan, marginBottom: 10}}>REV</div>
        <div
          style={{
            fontFamily: F.display,
            fontSize: 480,
            fontWeight: 900,
            letterSpacing: '-0.08em',
            lineHeight: 0.8,
            background: `linear-gradient(100deg, ${C.cyan}, ${C.violet} 55%, ${C.magenta})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            textShadow: `0 0 80px ${C.violet}44`,
          }}
        >
          {f < 4 ? scramble(f, '128', 4) : rev}
        </div>
      </div>

      {NAMES.map((name, index) => {
        const angle = (index / NAMES.length) * Math.PI * 2 + f * 0.03;
        const radius = 560 + Math.sin(index * 2.3) * 60;
        return (
          <div
            key={name}
            style={{
              position: 'absolute',
              left: 960 + Math.cos(angle) * radius,
              top: 540 + Math.sin(angle) * radius * 0.6,
              translate: '-50% -50%',
              fontFamily: F.mono,
              fontSize: 15,
              color: index % 3 === 0 ? C.cyan : C.dim,
              opacity: 0.38,
              padding: '4px 8px',
              background: '#0a0a1aaa',
              border: `1px solid ${C.line}`,
            }}
          >
            {name}
          </div>
        );
      })}
    </BeatShell>
  );
};

/* -------------------------------------------------- montage */

const FLASHES = [
  {word: 'МИР', color: C.cyan, ink: C.bg, tag: 'REV 128', frames: 10},
  {word: 'РЕЙТИНГ', color: C.amber, ink: C.bg, tag: '#1', frames: 10},
  {word: 'ЯЗЫК', color: C.violet, ink: C.bg, tag: '@eq', frames: 9},
  {word: 'ИВЕНТЫ', color: C.magenta, ink: C.white, tag: '03:12:44', frames: 9},
  {word: 'ЗАДАЧИ', color: C.bg, ink: C.cyan, tag: '6 / 6', frames: 8},
  {word: 'САБМИТЫ', color: C.magenta, ink: C.bg, tag: 'СЛОМАНО', frames: 8},
  {word: 'ГАЙД', color: C.cyan, ink: C.bg, tag: '5 / 0 → 42', frames: 7},
  {word: 'АДМИН', color: C.amber, ink: C.bg, tag: 'ROOT', frames: 7},
  {word: 'НОВОСТИ', color: C.white, ink: C.bg, tag: 'НОВОЕ', frames: 6},
  {word: 'АРЕНА', color: C.magenta, ink: C.white, tag: '∞', frames: 12},
];

const MontageBeat: React.FC<{f: number; dur: number}> = ({f, dur}) => {
  if (dur <= 0) return null;
  const totalFrames = FLASHES.reduce((sum, flash) => sum + flash.frames, 0);
  let cursor = 0;
  let current = FLASHES[0];
  let local = f;
  for (const flash of FLASHES) {
    if (f >= cursor && f < cursor + flash.frames) {
      current = flash;
      local = f - cursor;
      break;
    }
    cursor += flash.frames;
    current = flash;
    local = Math.min(f - cursor, flash.frames - 1);
  }
  if (f >= totalFrames) {
    current = FLASHES[FLASHES.length - 1];
    local = current.frames - 1;
  }
  const p = Math.min(1, local / 4);
  const isArena = current.word === 'АРЕНА';
  return (
    <AbsoluteFill style={{background: current.color, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${current.ink}22 1px, transparent 1px)`,
          backgroundSize: '100% 38px',
          opacity: 0.3,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          top: '50%',
          translate: '0 -50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: F.display,
            fontSize: isArena ? 280 : 230,
            fontWeight: 900,
            letterSpacing: '-0.07em',
            lineHeight: 0.82,
            color: current.ink,
            scale: 1.12 - p * 0.12,
            opacity: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {current.word}
        </div>
      </div>
      {isArena && (
        <div
          style={{
            position: 'absolute',
            right: 90,
            top: '50%',
            translate: '0 -50%',
            scale: 0.7 + p * 0.4,
            opacity: 0.3 + p * 0.7,
            rotate: `${-8 + p * 8}deg`,
          }}
        >
          <Neko size={250} mood="happy" t={f} />
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          left: 80,
          bottom: 70,
          fontFamily: F.mono,
          fontSize: 22,
          letterSpacing: '0.2em',
          color: current.ink,
          opacity: 0.72,
        }}
      >
        {current.tag}
      </div>
      <div
        style={{
          position: 'absolute',
          right: 80,
          bottom: 70,
          fontFamily: F.mono,
          fontSize: 14,
          letterSpacing: '0.24em',
          color: current.ink,
          opacity: 0.55,
        }}
      >
        LANGWARS / {String(FLASHES.indexOf(current) + 1).padStart(2, '0')}
      </div>
    </AbsoluteFill>
  );
};

/* -------------------------------------------------- outro */

const OutroBeat: React.FC<{f: number; dur: number}> = ({f, dur}) => {
  const zoom = 1 + seg(f, 0, dur) * 0.02 + seg(f, dur - 18, dur) * 0.14;
  const flash = seg(f, dur - 8, dur);
  return (
    <BeatShell f={f} dur={dur} bg={<Backdrop accent={C.magenta} glow={C.violet} />}>
      <div style={{position: 'absolute', inset: 0, scale: zoom}}>
        <div style={{position: 'absolute', left: 110, top: 160}}>
          <Chars
            text="ОДИН МИР."
            size={156}
            color={C.cyan}
            start={0}
            stagger={1.2}
            duration={12}
            lineHeight={0.9}
          />
          <div style={{marginTop: 8}}>
            <Chars
              text="ТВОЙ ХОД."
              size={252}
              start={6}
              stagger={1.2}
              duration={14}
              lineHeight={0.88}
              gradient={`linear-gradient(100deg, ${C.text}, ${C.violet} 44%, ${C.magenta})`}
              glitch={f > 42 && f < 52 ? 3 : 0}
            />
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 760,
            overflow: 'hidden',
            opacity: 0.14,
            maskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 38,
              width: 'max-content',
              translate: `${-f * 9}px 0px`,
              fontFamily: F.mono,
              fontSize: 17,
              letterSpacing: '0.18em',
              color: C.muted,
              whiteSpace: 'nowrap',
            }}
          >
            {[...NAMES, ...NAMES, ...NAMES].map((name, index) => (
              <span key={`${name}-${index}`}>{name.toUpperCase()}</span>
            ))}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            right: 120,
            bottom: 100,
            rotate: '-6deg',
            opacity: outExpo(seg(f, 12, 24)),
          }}
        >
          <Neko size={260} mood="happy" t={f} />
        </div>

        <div
          style={{
            position: 'absolute',
            left: 118,
            bottom: 96,
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            opacity: outExpo(seg(f, 16, 26)),
          }}
        >
          {['ОБЩИЙ МИР', 'ОБЩИЕ ИМЕНА', 'ОБЩИЙ РИСК'].map((phrase) => (
            <span
              key={phrase}
              style={{
                fontFamily: F.mono,
                fontSize: 13,
                letterSpacing: '0.18em',
                color: C.muted,
                border: `1px solid ${C.line}`,
                padding: '6px 11px',
              }}
            >
              {phrase}
            </span>
          ))}
        </div>
      </div>

      <AbsoluteFill style={{background: C.white, opacity: flash * 0.95, mixBlendMode: 'screen', zIndex: 30}} />
    </BeatShell>
  );
};

/* -------------------------------------------------- sequence */

const BEATS = [
  {start: 0, dur: 36, render: IntroBeat},
  {start: 36, dur: 84, render: WorldBeat},
  {start: 120, dur: 48, render: RatingBeat},
  {start: 168, dur: 48, render: LanguageBeat},
  {start: 216, dur: 42, render: RecheckBeat},
  {start: 258, dur: 42, render: EventsBeat},
  {start: 300, dur: 36, render: TasksBeat},
  {start: 336, dur: 36, render: PublishBeat},
  {start: 372, dur: 30, render: SubmissionsBeat},
  {start: 402, dur: 24, render: GuideBeat},
  {start: 426, dur: 24, render: AdminBeat},
  {start: 450, dur: 24, render: NewsBeat},
  {start: 474, dur: 36, render: RevisionBeat},
  {start: 510, dur: 90, render: MontageBeat},
  {start: 600, dur: 90, render: OutroBeat},
];

export const S4Showreel: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = BEATS.find((item) => frame >= item.start && frame < item.start + item.dur) ?? BEATS[BEATS.length - 1];
  const local = frame - beat.start;
  const Component = beat.render;
  return (
    <AbsoluteFill>
      <Component f={local} dur={beat.dur} />
      {frame < 6 && (
        <AbsoluteFill style={{background: C.white, opacity: 0.9 * (1 - frame / 6), mixBlendMode: 'screen'}} />
      )}
    </AbsoluteFill>
  );
};
