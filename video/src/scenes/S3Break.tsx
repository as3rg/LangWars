import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {Neko} from '../components/Neko';
import {Chars} from '../components/Type';
import {Avatar, Code, Pill, Window} from '../components/ui';
import {C, F} from '../theme';
import {makeShards, outExpo, rand, scramble, seg} from '../lib/anim';

const SOLUTION = `@solution\nfn solve() {\n  return answer + 1;\n}`;

const TEST_DOTS = 6;

export const S3Break: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const aIn = spring({frame, fps, config: {damping: 18, stiffness: 120, mass: 0.9}});
  const bIn = spring({frame: frame - 44, fps, config: {damping: 16, stiffness: 190, mass: 0.8}});

  const typedLines = frame < 10 ? 0 : frame < 14 ? 1 : frame < 18 ? 2 : frame < 22 ? 3 : 4;
  const codeVisible = typedLines >= 4;

  const worldUpdated = frame >= 90;
  const aBroken = frame >= 106;
  const worldValue = worldUpdated ? '100' : '50';
  const worldOwner = worldUpdated ? 'beta' : 'alpha';
  const rev = worldUpdated ? 128 : 127;

  const resultValue = aBroken ? (frame < 112 ? scramble(frame, '101', 9) : '101') : frame < 34 ? '—' : '51';
  const passed = !aBroken;

  const shake1 = frame >= 90 ? Math.max(0, 1 - (frame - 90) / 18) * 13 : 0;
  const shake2 = frame >= 106 ? Math.max(0, 1 - (frame - 106) / 18) * 17 : 0;
  const shake = shake1 + shake2;
  const shakeX = Math.sin(frame * 2.7) * shake;
  const shakeY = Math.cos(frame * 3.1) * shake * 0.7;

  const flash = Math.max(0, 1 - Math.abs(frame - 90) / 7) * 0.8 + Math.max(0, 1 - Math.abs(frame - 106) / 6) * 0.5;

  const callout = outExpo(seg(frame, 122, 134));
  const calloutOut = seg(frame, 154, 164);
  const nameIn = outExpo(seg(frame, 158, 172));
  const nameOut = seg(frame, 198, 210);
  const uiDim = 1 - 0.78 * Math.max(seg(frame, 122, 134), seg(frame, 158, 172));

  const flight = seg(frame, 74, 90);
  const p = flight;
  const fx = (1 - p) * (1 - p) * 1410 + 2 * (1 - p) * p * 1340 + p * p * 1500;
  const fy = (1 - p) * (1 - p) * 704 + 2 * (1 - p) * p * 510 + p * p * 304;

  const beam = outExpo(seg(frame, 94, 106));
  const shards = makeShards(28, 17);
  const sinceImpact = frame - 90;

  return (
    <AbsoluteFill>
      <Backdrop accent={C.magenta} glow={C.violet} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          translate: `${shakeX}px ${shakeY}px`,
          opacity: uiDim,
        }}
      >
        {/* A — the solution that used to pass */}
        <div
          style={{
            position: 'absolute',
            left: 130,
            top: 150,
            width: 1060,
            height: 600,
            opacity: aIn,
            translate: `0px ${(1 - aIn) * 220}px`,
            scale: 0.985 + aIn * 0.015,
            zIndex: 3,
          }}
        >
          <Window
            title="submission_a.lws"
            accent={C.cyan}
            right={
              <span style={{display: 'flex', alignItems: 'center', gap: 9}}>
                <Avatar name="alpha" size={26} />
                <span style={{fontFamily: F.mono, fontSize: 13, color: C.muted}}>alpha</span>
                <Pill tone="violet">V0.3</Pill>
              </span>
            }
            style={{
              height: '100%',
              borderColor: aBroken ? `${C.magenta}99` : C.line,
              boxShadow: aBroken
                ? `0 28px 90px #0009, 0 0 90px ${C.magenta}30`
                : `0 28px 90px #0009, 0 0 50px ${C.cyan}12`,
            }}
            bodyStyle={{padding: '66px 34px 0', height: 456}}
            footer={
              <div style={{display: 'flex', alignItems: 'center', width: '100%', gap: 18}}>
                <Pill tone={passed ? (frame < 34 ? 'muted' : 'ok') : 'bad'}>
                  {passed ? (frame < 34 ? '···' : '✓ ПРОЙДЕНО') : '✕ СЛОМАНО'}
                </Pill>
                <div style={{display: 'flex', gap: 6}}>
                  {Array.from({length: TEST_DOTS}, (_, index) => {
                    const on = frame >= 34 + index * 1.2;
                    const failAt = 106 + index * 2;
                    const ok = aBroken ? frame < failAt : on;
                    return (
                      <span
                        key={index}
                        style={{
                          width: 13,
                          height: 13,
                          borderRadius: 2,
                          background: !on ? C.line : ok ? C.cyan : C.magenta,
                          opacity: on ? 0.95 : 0.5,
                          boxShadow: on ? `0 0 8px ${ok ? C.cyan : C.magenta}88` : undefined,
                        }}
                      />
                    );
                  })}
                </div>
                <span style={{fontFamily: F.mono, fontSize: 15, color: C.dim, letterSpacing: '0.08em'}}>
                  {!aBroken && frame < 34 ? '—' : aBroken ? '0/6' : '6/6'}
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontFamily: F.mono,
                    fontSize: 64,
                    fontWeight: 700,
                    color: passed ? C.cyan : C.magenta,
                    textShadow: `0 0 30px ${passed ? C.cyan : C.magenta}55`,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                  }}
                >
                  {resultValue}
                </span>
              </div>
            }
          >
            {codeVisible ? (
              <Code
                code={SOLUTION}
                size={38}
                lineHeight={1.7}
                lineNumbers
                highlights={aBroken ? [2] : []}
                highlightColor={C.magenta}
                emphasize={['answer']}
                emphasizeColor={aBroken ? C.magenta : C.cyan}
              />
            ) : (
              <Code
                code={SOLUTION.split('\n').slice(0, Math.max(0, typedLines)).join('\n')}
                size={38}
                lineHeight={1.7}
                lineNumbers
                caretLine={Math.max(0, typedLines - 1)}
              />
            )}
          </Window>

          {aBroken && (
            <svg
              width="1060"
              height="600"
              viewBox="0 0 1060 600"
              style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}
            >
              {Array.from({length: 9}, (_, index) => {
                const angle = rand(index * 4.3) * Math.PI * 2;
                const length = 70 + rand(index * 8.1) * 300;
                const x = 430;
                const y = 260;
                return (
                  <line
                    key={index}
                    x1={x}
                    y1={y}
                    x2={x + Math.cos(angle) * length}
                    y2={y + Math.sin(angle) * length}
                    stroke={C.magenta}
                    strokeWidth={index % 3 === 0 ? 2.2 : 1}
                    opacity={Math.min(1, (frame - 106) / 7) * 0.65}
                  />
                );
              })}
            </svg>
          )}
        </div>

        {/* shared world panel */}
        <div
          style={{
            position: 'absolute',
            left: 1250,
            top: 150,
            width: 560,
            height: 410,
            zIndex: 4,
          }}
        >
          <Window
            title="namespace"
            accent={C.cyan}
            right={<Pill tone={worldUpdated ? 'magenta' : 'cyan'}>REV {rev}</Pill>}
            style={{height: '100%'}}
            bodyStyle={{padding: '0 20px'}}
          >
            {[
              {name: 'answer', value: worldValue, owner: worldOwner, hot: worldUpdated},
              {name: 'total', value: '51', owner: 'alpha'},
              {name: 'mirror', value: '1', owner: 'v0id'},
            ].map((row, index) => {
              const flashRow = row.hot ? Math.max(0, 1 - (frame - 90) / 22) : 0;
              return (
                <div
                  key={row.name}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.1fr 0.75fr 0.65fr',
                    alignItems: 'center',
                    height: 100,
                    borderBottom: index < 2 ? `1px solid ${C.lineSoft}` : undefined,
                    background: row.hot ? `linear-gradient(90deg, ${C.magenta}${flashRow > 0.25 ? '20' : '0c'}, transparent 74%)` : undefined,
                    boxShadow: row.hot && flashRow > 0.2 ? `inset 3px 0 ${C.magenta}` : undefined,
                  }}
                >
                  <span style={{fontFamily: F.mono, fontSize: 23, color: C.pale}}>{row.name}</span>
                  <span
                    style={{
                      fontFamily: F.mono,
                      fontSize: 26,
                      color: row.hot ? C.magenta : C.cyan,
                      textShadow: row.hot ? `0 0 18px ${C.magenta}66` : undefined,
                      textAlign: 'right',
                      paddingRight: 8,
                    }}
                  >
                    {row.value}
                  </span>
                  <span style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 7}}>
                    <Avatar name={row.owner} size={21} />
                    <span style={{fontFamily: F.mono, fontSize: 12, color: C.dim}}>{row.owner}</span>
                  </span>
                </div>
              );
            })}
          </Window>
        </div>

        {/* B — the submission that changes one name */}
        <div
          style={{
            position: 'absolute',
            left: 1200,
            top: 650,
            width: 660,
            height: 286,
            opacity: bIn,
            translate: `${(1 - bIn) * 480}px ${(1 - bIn) * 100}px`,
            rotate: `${(1 - bIn) * 5}deg`,
            zIndex: 5,
          }}
        >
          <Window
            title="submission_b.lws"
            accent={C.magenta}
            right={
              <span style={{display: 'flex', alignItems: 'center', gap: 9}}>
                <Avatar name="beta" size={26} />
                <span style={{fontFamily: F.mono, fontSize: 13, color: C.muted}}>beta</span>
              </span>
            }
            style={{borderColor: `${C.magenta}66`, boxShadow: `0 28px 80px #0009, 0 0 60px ${C.magenta}1f`}}
            bodyStyle={{padding: '26px 26px 20px'}}
          >
            <div style={{fontFamily: F.mono, fontSize: 31, color: C.pale, whiteSpace: 'nowrap'}}>
              <span style={{color: '#ff7ab6'}}>let</span>{' '}
              <span
                style={{
                  background: `${C.magenta}2e`,
                  color: C.magenta,
                  padding: '2px 7px',
                  borderRadius: 4,
                  boxShadow: `0 0 22px ${C.magenta}22`,
                  borderBottom: `2px solid ${C.magenta}`,
                }}
              >
                answer
              </span>{' '}
              <span style={{color: '#8d8db4'}}>=</span>{' '}
              <span style={{color: '#ffb86b'}}>100</span>
              <span style={{color: '#8d8db4'}}>;</span>
            </div>
            <div
              style={{
                marginTop: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontFamily: F.mono,
                fontSize: 13,
                letterSpacing: '0.14em',
                color: C.magenta,
                opacity: frame > 64 ? 1 : 0.25,
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 99,
                  background: C.magenta,
                  boxShadow: `0 0 12px ${C.magenta}`,
                }}
              />
              {frame < 90 ? 'ПУБЛИКАЦИЯ' : 'ОПУБЛИКОВАНО'}
            </div>
          </Window>
        </div>

        {/* nameless variable token travelling into the world */}
        {frame >= 72 && frame <= 91 && (
          <div
            style={{
              position: 'absolute',
              left: fx,
              top: fy,
              zIndex: 8,
              rotate: `${-6 + p * 14}deg`,
              scale: 0.65 + p * 0.4,
              filter: `drop-shadow(0 0 26px ${C.magenta})`,
            }}
          >
            {[3, 2, 1].map((g) => (
              <div
                key={g}
                style={{
                  position: 'absolute',
                  left: -p * 9 * g,
                  top: p * 7 * g,
                  opacity: 0.11 * (4 - g),
                  border: `1px solid ${C.magenta}`,
                  background: '#0a0a1a',
                  padding: '8px 13px',
                  fontFamily: F.mono,
                  fontSize: 22,
                  color: C.magenta,
                  whiteSpace: 'nowrap',
                }}
              >
                answer = 100
              </div>
            ))}
            <div
              style={{
                border: `1px solid ${C.magenta}`,
                background: '#0a0a1a',
                padding: '8px 13px',
                fontFamily: F.mono,
                fontSize: 22,
                color: C.magenta,
                whiteSpace: 'nowrap',
              }}
            >
              answer = 100
            </div>
          </div>
        )}

        {/* link from world to the solution */}
        {frame >= 94 && frame <= 108 && (
          <svg
            width="1920"
            height="1080"
            viewBox="0 0 1920 1080"
            style={{position: 'absolute', inset: 0, zIndex: 7, pointerEvents: 'none'}}
          >
            <line
              x1={1250}
              y1={300}
              x2={1250 - (1250 - 520) * beam}
              y2={300 + (360 - 300) * beam}
              stroke={C.magenta}
              strokeWidth={2}
              opacity={0.7}
              strokeDasharray="8 8"
            />
            <circle
              cx={1250 - (1250 - 520) * beam}
              cy={300 + (360 - 300) * beam}
              r={6}
              fill={C.magenta}
              opacity={0.9}
              style={{filter: `drop-shadow(0 0 14px ${C.magenta})`}}
            />
          </svg>
        )}

        {frame >= 90 &&
          shards.map((shard, index) => {
            const t = Math.max(0, sinceImpact - shard.delay) / 30;
            if (t > 1.4) return null;
            const tone = [C.magenta, C.cyan, C.amber][shard.hue];
            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: 1500 + shard.x * t,
                  top: 304 + shard.y * t + 300 * t * t,
                  width: shard.size,
                  height: shard.size * 0.55,
                  background: tone,
                  opacity: Math.max(0, 1 - t / 1.2),
                  rotate: `${shard.rotate + t * 260}deg`,
                  boxShadow: `0 0 10px ${tone}`,
                  zIndex: 9,
                }}
              />
            );
          })}

        {frame >= 90 && sinceImpact < 24 && (
          <div
            style={{
              position: 'absolute',
              left: 1500,
              top: 304,
              width: 40 + sinceImpact * 44,
              height: 40 + sinceImpact * 44,
              translate: '-50% -50%',
              borderRadius: 999,
              border: `${Math.max(1, 7 - sinceImpact * 0.3)}px solid ${C.magenta}`,
              opacity: Math.max(0, 1 - sinceImpact / 22) * 0.8,
              boxShadow: `0 0 40px ${C.magenta}`,
              zIndex: 8,
            }}
          />
        )}
      </div>

      <AbsoluteFill
        style={{
          background: C.magenta,
          opacity: flash,
          mixBlendMode: 'screen',
          zIndex: 12,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 14,
          opacity: callout * (1 - calloutOut),
          scale: 0.94 + callout * 0.06,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 34,
            padding: '24px 44px',
            background: '#050510f2',
            border: `1px solid ${C.magenta}66`,
            boxShadow: `0 0 90px ${C.magenta}33`,
          }}
        >
          <span
            style={{
              fontFamily: F.display,
              fontSize: 104,
              fontWeight: 800,
              color: C.muted,
              textDecoration: 'line-through',
              textDecorationColor: C.magenta,
              textDecorationThickness: 8,
              letterSpacing: '-0.05em',
            }}
          >
            51
          </span>
          <span style={{fontFamily: F.mono, fontSize: 50, color: C.magenta}}>→</span>
          <span
            style={{
              fontFamily: F.display,
              fontSize: 144,
              fontWeight: 900,
              color: C.magenta,
              letterSpacing: '-0.05em',
              textShadow: `0 0 50px ${C.magenta}66`,
              lineHeight: 1,
            }}
          >
            101
          </span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 15,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 26,
          background: `radial-gradient(circle at 50% 50%, #050510e8, #050510fa 62%)`,
          opacity: nameIn * (1 - nameOut),
          pointerEvents: 'none',
        }}
      >
        <Chars
          text="ОДНО ИМЯ."
          size={214}
          color={C.magenta}
          start={0}
          stagger={1.4}
          duration={10}
          lineHeight={0.9}
          glitch={frame > 160 && frame < 178 ? 3 : 0}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            opacity: nameIn,
            translate: `0px ${(1 - nameIn) * 20}px`,
          }}
        >
          <span
            style={{
              fontFamily: F.mono,
              fontSize: 30,
              color: C.text,
              padding: '8px 16px',
              border: `1px solid ${C.magenta}66`,
              background: `${C.magenta}14`,
            }}
          >
            answer
          </span>
          <span style={{fontFamily: F.mono, fontSize: 22, color: C.dim, letterSpacing: '0.16em'}}>
            ОБЩЕЕ ДЛЯ ВСЕХ
          </span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 88,
          bottom: 88,
          zIndex: 16,
          opacity: outExpo(seg(frame, 172, 186)) * (1 - seg(frame, 224, 234)),
          rotate: `${Math.sin(frame * 0.2) * 3}deg`,
        }}
      >
        <Neko size={150} mood="shock" t={frame} />
      </div>
    </AbsoluteFill>
  );
};
