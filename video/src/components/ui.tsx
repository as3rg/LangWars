import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {C, F} from '../theme';
import {QR_IMAGE} from '../content';
import {rand} from '../lib/anim';

type Tone = 'cyan' | 'magenta' | 'violet' | 'amber' | 'muted' | 'ok' | 'bad';

const TONES: Record<Tone, {color: string; bg: string; border: string}> = {
  cyan: {color: C.cyan, bg: 'rgba(15,241,202,.08)', border: 'rgba(15,241,202,.38)'},
  magenta: {color: C.magenta, bg: 'rgba(255,46,136,.1)', border: 'rgba(255,46,136,.42)'},
  violet: {color: '#b39bff', bg: 'rgba(138,92,246,.12)', border: 'rgba(138,92,246,.45)'},
  amber: {color: C.amber, bg: 'rgba(255,207,92,.1)', border: 'rgba(255,207,92,.42)'},
  muted: {color: C.muted, bg: 'rgba(255,255,255,.03)', border: C.line},
  ok: {color: C.cyan, bg: 'rgba(15,241,202,.1)', border: 'rgba(15,241,202,.5)'},
  bad: {color: C.magenta, bg: 'rgba(255,46,136,.12)', border: 'rgba(255,46,136,.55)'},
};

export const Pill: React.FC<{
  children: React.ReactNode;
  tone?: Tone;
  style?: React.CSSProperties;
}> = ({children, tone = 'muted', style}) => {
  const palette = TONES[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '4px 10px',
        borderRadius: 6,
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        color: palette.color,
        fontFamily: F.mono,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.08em',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export const Dot: React.FC<{tone?: string; size?: number; pulse?: boolean}> = ({
  tone = C.cyan,
  size = 9,
  pulse,
}) => (
  <span
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: 999,
      background: tone,
      boxShadow: pulse ? `0 0 12px ${tone}, 0 0 24px ${tone}66` : `0 0 8px ${tone}88`,
      flexShrink: 0,
    }}
  />
);

export const Avatar: React.FC<{name: string; size?: number; style?: React.CSSProperties}> = ({
  name,
  size = 30,
  style,
}) => {
  const hue = Math.floor(rand(name.length * 7 + name.charCodeAt(0)) * 360);
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, hsl(${hue} 80% 62%), hsl(${(hue + 70) % 360} 80% 52%))`,
        color: '#050510',
        fontFamily: F.mono,
        fontWeight: 800,
        fontSize: size * 0.42,
        flexShrink: 0,
        ...style,
      }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
};

export const Window: React.FC<{
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  accent?: string;
  footer?: React.ReactNode;
}> = ({title, right, children, style, bodyStyle, accent = C.cyan, footer}) => (
  <div
    style={{
      border: `1px solid ${C.line}`,
      borderRadius: 16,
      background: 'linear-gradient(165deg, rgba(17,17,42,.97), rgba(7,7,20,.98))',
      boxShadow: `0 28px 90px rgba(0,0,0,.5), 0 0 50px ${accent}12`,
      overflow: 'hidden',
      ...style,
    }}
  >
    <div
      style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 17px',
        borderBottom: `1px solid ${C.lineSoft}`,
        background: 'linear-gradient(to bottom, rgba(18,18,44,.95), rgba(10,10,26,.9))',
      }}
    >
      <span style={{width: 10, height: 10, borderRadius: 999, background: '#ff5f7a'}} />
      <span style={{width: 10, height: 10, borderRadius: 999, background: C.amber}} />
      <span style={{width: 10, height: 10, borderRadius: 999, background: C.cyan}} />
      {title && (
        <span
          style={{
            marginLeft: 10,
            fontFamily: F.mono,
            fontSize: 14,
            color: C.muted,
            letterSpacing: '0.04em',
          }}
        >
          {title}
        </span>
      )}
      <span style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9}}>{right}</span>
    </div>
    <div style={bodyStyle}>{children}</div>
    {footer && (
      <div
        style={{
          borderTop: `1px solid ${C.lineSoft}`,
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontFamily: F.mono,
          fontSize: 12,
          color: C.dim,
          background: '#08081a',
        }}
      >
        {footer}
      </div>
    )}
  </div>
);

const tokenize = (line: string, emphasize: string[], emphasizeColor: string) => {
  const regex =
    /\/\/.*|"(?:[^"\\]|\\.)*"|@[a-z_]+|__builtin_[a-z_]+__|\b(?:let|fn|return|if|else|while|true|false|and|or|not)\b|\b(?:int|float|string|list|dict|function)\b|\b\d+\b|[A-Za-z_]\w*|\s+|./g;
  const parts = line.match(regex) ?? [];
  let previous = '';
  return parts.map((part, index) => {
    let color = '#d9d9ff';
    let italic = false;
    if (part.startsWith('//')) {
      color = '#72729d';
      italic = true;
    } else if (part.startsWith('"')) {
      color = '#9bf7e4';
    } else if (part.startsWith('@')) {
      color = C.amber;
    } else if (part.startsWith('__builtin_')) {
      color = '#b39bff';
    } else if (/^(let|fn|return|if|else|while|true|false|and|or|not)$/.test(part)) {
      color = '#ff7ab6';
    } else if (/^(int|float|string|list|dict|function)$/.test(part)) {
      color = '#8fd7ff';
    } else if (/^\d+$/.test(part)) {
      color = '#ffb86b';
    } else if (/^[A-Za-z_]\w*$/.test(part)) {
      color = previous === 'fn' ? '#ffffff' : '#d9d9ff';
    } else if (!/^\s+$/.test(part)) {
      color = '#8d8db4';
    }
    if (!/^\s+$/.test(part)) previous = part;
    const emphasized = emphasize.includes(part);
    return (
      <span
        key={index}
        style={{
          color,
          fontStyle: italic ? 'italic' : undefined,
          borderBottom: emphasized ? `2px solid ${emphasizeColor}` : undefined,
          boxShadow: emphasized ? `inset 0 -8px 0 ${emphasizeColor}22` : undefined,
          background: emphasized ? `${emphasizeColor}14` : undefined,
        }}
      >
        {part}
      </span>
    );
  });
};

export const Code: React.FC<{
  code: string;
  size?: number;
  lineHeight?: number;
  lineNumbers?: boolean;
  highlights?: number[];
  highlightColor?: string;
  style?: React.CSSProperties;
  startLine?: number;
  caretLine?: number;
  caretFrame?: number;
  emphasize?: string[];
  emphasizeColor?: string;
}> = ({
  code,
  size = 26,
  lineHeight = 1.65,
  lineNumbers,
  highlights = [],
  highlightColor = C.magenta,
  style,
  startLine = 1,
  caretLine,
  emphasize = [],
  emphasizeColor = C.cyan,
}) => {
  const frame = useCurrentFrame();
  const lines = code.replace(/^\n|\n$/g, '').split('\n');
  return (
    <div
      style={{
        fontFamily: F.mono,
        fontSize: size,
        lineHeight,
        whiteSpace: 'pre',
        ...style,
      }}
    >
      {lines.map((line, index) => {
        const lineNumber = startLine + index;
        const active = highlights.includes(index);
        return (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              background: active ? `${highlightColor}1f` : undefined,
              boxShadow: active ? `inset 3px 0 ${highlightColor}` : undefined,
              padding: active ? '1px 14px 1px 0' : '1px 0',
              marginLeft: active ? -14 : 0,
              borderRadius: 2,
            }}
          >
            {lineNumbers && (
              <span
                style={{
                  width: 46,
                  marginRight: 20,
                  textAlign: 'right',
                  color: active ? highlightColor : '#3f3f62',
                  fontSize: size * 0.62,
                  flexShrink: 0,
                  userSelect: 'none',
                }}
              >
                {lineNumber}
              </span>
            )}
            <span>
              {tokenize(line, emphasize, emphasizeColor)}
              {caretLine === index && (
                <span
                  style={{
                    display: 'inline-block',
                    width: size * 0.55,
                    height: size * 1.05,
                    background: Math.floor(frame / 12) % 2 === 0 ? C.cyan : 'transparent',
                    verticalAlign: 'text-bottom',
                    marginLeft: 2,
                    boxShadow: `0 0 12px ${C.cyan}66`,
                  }}
                />
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const MiniBar: React.FC<{value: number; color?: string; width?: number}> = ({
  value,
  color = C.cyan,
  width = 140,
}) => (
  <span style={{display: 'inline-block', width, height: 5, borderRadius: 3, background: '#ffffff12', overflow: 'hidden'}}>
    <span
      style={{
        display: 'block',
        height: '100%',
        width: `${Math.max(0, Math.min(1, value)) * 100}%`,
        background: color,
        boxShadow: `0 0 10px ${color}`,
        borderRadius: 3,
      }}
    />
  </span>
);

export const QrCode: React.FC<{size?: number; style?: React.CSSProperties}> = ({
  size = 380,
  style,
}) => {
  const frame = useCurrentFrame();
  const cells = 25;
  const cell = 100 / cells;
  const isFinder = (x: number, y: number) => {
    const inBox = (bx: number, by: number) => x >= bx && x < bx + 7 && y >= by && y < by + 7;
    return inBox(0, 0) || inBox(18, 0) || inBox(0, 18);
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        background: '#f2fff9',
        padding: size * 0.075,
        boxShadow: `0 0 70px ${C.cyan}33`,
        ...style,
      }}
    >
      {QR_IMAGE ? (
        <Img src={staticFile(QR_IMAGE)} style={{width: '100%', height: '100%', display: 'block'}} />
      ) : (
        <div style={{position: 'relative', width: '100%', height: '100%', background: '#f2fff9'}}>
          {Array.from({length: cells * cells}, (_, index) => {
            const x = index % cells;
            const y = Math.floor(index / cells);
            if (isFinder(x, y)) return null;
            const on = rand(x * 31.7 + y * 17.3 + 4) > 0.52;
            if (!on) return null;
            return (
              <span
                key={index}
                style={{
                  position: 'absolute',
                  left: `${x * cell}%`,
                  top: `${y * cell}%`,
                  width: `${cell + 0.15}%`,
                  height: `${cell + 0.15}%`,
                  background: '#06100d',
                }}
              />
            );
          })}

          {[
            [0, 0],
            [18, 0],
            [0, 18],
          ].map(([bx, by]) => (
            <div
              key={`${bx}-${by}`}
              style={{
                position: 'absolute',
                left: `${bx * cell}%`,
                top: `${by * cell}%`,
                width: `${cell * 7}%`,
                height: `${cell * 7}%`,
                background: '#06100d',
                padding: `${cell * 1}%`,
              }}
            >
              <div style={{width: '100%', height: '100%', background: '#f2fff9', padding: `${cell * 1}%`}}>
                <div style={{width: '100%', height: '100%', background: '#06100d'}} />
              </div>
            </div>
          ))}

          <div
            style={{
              position: 'absolute',
              left: '35%',
              top: '35%',
              width: '30%',
              height: '30%',
              background: '#f2fff9',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <div
              style={{
                width: '76%',
                height: '76%',
                background: '#06100d',
                position: 'relative',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <span style={{fontFamily: F.pixel, fontSize: size * 0.055, color: C.cyan}}>9</span>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${(frame * 2.4) % 100}%`,
              height: 3,
              background: `linear-gradient(90deg, transparent, ${C.cyan}, transparent)`,
              boxShadow: `0 0 18px ${C.cyan}`,
              opacity: 0.65,
            }}
          />
        </div>
      )}
    </div>
  );
};
