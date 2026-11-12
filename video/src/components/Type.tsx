import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, F} from '../theme';
import {outExpo, seg} from '../lib/anim';

type CharsProps = {
  text: string;
  size?: number;
  color?: string;
  start?: number;
  stagger?: number;
  duration?: number;
  font?: string;
  weight?: number;
  letterSpacing?: string;
  lineHeight?: number;
  outline?: boolean;
  gradient?: string;
  glitch?: number;
  style?: React.CSSProperties;
  distance?: number;
};

export const Chars: React.FC<CharsProps> = ({
  text,
  size = 140,
  color = C.text,
  start = 0,
  stagger = 1.1,
  duration = 16,
  font = F.display,
  weight = 800,
  letterSpacing = '-0.045em',
  lineHeight = 0.92,
  outline,
  gradient,
  glitch = 0,
  style,
  distance = 80,
}) => {
  const frame = useCurrentFrame();
  const chars = [...text];

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        fontFamily: font,
        fontSize: size,
        fontWeight: weight,
        letterSpacing,
        lineHeight,
        textTransform: 'uppercase',
        position: 'relative',
        ...style,
      }}
    >
      {chars.map((char, index) => {
        const local = outExpo(seg(frame, start + index * stagger, start + index * stagger + duration));
        const jitter = glitch
          ? (Math.sin((frame + index * 7) * 1.7) * glitch)
          : 0;
        return (
          <span
            key={index}
            style={{
              display: 'inline-block',
              whiteSpace: 'pre',
              opacity: char === ' ' ? 1 : local,
              translate: `0px ${(1 - local) * distance + jitter}px`,
              rotate: glitch ? `${Math.sin(frame + index) * glitch * 0.05}deg` : undefined,
              color: outline ? 'transparent' : gradient ? 'transparent' : color,
              WebkitTextStroke: outline ? `2px ${color}` : undefined,
              backgroundImage: gradient,
              backgroundClip: gradient ? 'text' : undefined,
              WebkitBackgroundClip: gradient ? 'text' : undefined,
              textShadow: glitch
                ? `${2 + glitch}px 0 ${C.magenta}88, ${-2 - glitch}px 0 ${C.cyan}88`
                : undefined,
              position: 'relative',
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </div>
  );
};

export const Lines: React.FC<{
  lines: string[];
  size?: number;
  color?: string;
  start?: number;
  stagger?: number;
  font?: string;
  weight?: number;
  lineHeight?: number;
  outlineIndex?: number;
  gradient?: string;
  glitch?: number;
  style?: React.CSSProperties;
  align?: React.CSSProperties['alignItems'];
}> = ({
  lines,
  size = 140,
  color = C.text,
  start = 0,
  stagger = 3,
  font = F.display,
  weight = 800,
  lineHeight = 0.9,
  outlineIndex,
  gradient,
  glitch,
  style,
  align = 'flex-start',
}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: align, ...style}}>
    {lines.map((line, index) => (
      <Chars
        key={index}
        text={line}
        size={size}
        color={color}
        start={start + index * stagger}
        stagger={0.9}
        font={font}
        weight={weight}
        lineHeight={lineHeight}
        outline={outlineIndex === index}
        gradient={gradient}
        glitch={glitch}
      />
    ))}
  </div>
);

export const Kicker: React.FC<{
  children: React.ReactNode;
  color?: string;
  start?: number;
  style?: React.CSSProperties;
}> = ({children, color = C.cyan, start = 0, style}) => {
  const frame = useCurrentFrame();
  const progress = outExpo(seg(frame, start, start + 14));
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: F.mono,
        fontSize: 15,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color,
        opacity: progress,
        translate: `0px ${(1 - progress) * 14}px`,
        ...style,
      }}
    >
      <span style={{width: 26, height: 2, background: color, boxShadow: `0 0 8px ${color}`}} />
      {children}
    </div>
  );
};

export const Strike: React.FC<{
  progress: number;
  color?: string;
  height?: number;
  style?: React.CSSProperties;
}> = ({progress, color = C.magenta, height = 7, style}) => (
  <div
    style={{
      position: 'absolute',
      left: '-2%',
      top: '52%',
      height,
      width: `${Math.max(0, Math.min(1, progress)) * 104}%`,
      background: color,
      boxShadow: `0 0 18px ${color}`,
      rotate: '-2deg',
      ...style,
    }}
  />
);
