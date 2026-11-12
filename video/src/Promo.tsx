import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {S1Logo} from './scenes/S1Logo';
import {S2Manifesto} from './scenes/S2Manifesto';
import {S3Break} from './scenes/S3Break';
import {S4Showreel} from './scenes/S4Showreel';
import {S5Join} from './scenes/S5Join';
import {ScreenFrame} from './components/ScreenFrame';
import {C} from './theme';
import {outExpo, seg} from './lib/anim';

const CUTS = [
  {at: 120, color: C.magenta, accent: C.cyan},
  {at: 330, color: C.violet, accent: C.magenta},
  {at: 576, color: C.magenta, accent: C.cyan},
  {at: 1266, color: C.cyan, accent: C.white},
];

const CutOverlay: React.FC<{frame: number; at: number; color: string; accent: string}> = ({
  frame,
  at,
  color,
  accent,
}) => {
  const local = frame - at;
  if (local < -2 || local > 11) return null;
  const p = seg(local, -2, 11);
  const flash = Math.max(0, 1 - Math.abs(local) / 4);
  return (
    <AbsoluteFill style={{zIndex: 210, pointerEvents: 'none', overflow: 'hidden'}}>
      {Array.from({length: 9}, (_, index) => {
        const width = 5 + (index % 4) * 5;
        const offset = (1 - Math.min(1, Math.max(0, p))) * 2400;
        const x = -220 + index * 260 + offset;
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: x,
              top: '-20%',
              width,
              height: '140%',
              background: `linear-gradient(180deg, transparent, ${index % 2 === 0 ? color : accent}, transparent)`,
              opacity: Math.sin(Math.min(1, Math.max(0, p)) * Math.PI) * 0.7,
              transform: 'skewX(-18deg)',
              filter: 'blur(1px)',
              mixBlendMode: 'screen',
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, ${accent}66, transparent 60%)`,
          opacity: flash * 0.75,
          mixBlendMode: 'screen',
        }}
      />
    </AbsoluteFill>
  );
};

export const LangWarsPromo: React.FC = () => {
  const frame = useCurrentFrame();
  const end = outExpo(seg(frame, 1590, 1600));

  return (
    <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
      <Sequence durationInFrames={120} name="01 — Logo">
        <S1Logo />
      </Sequence>
      <Sequence from={120} durationInFrames={210} name="02 — Manifesto">
        <S2Manifesto />
      </Sequence>
      <Sequence from={330} durationInFrames={246} name="03 — Break">
        <S3Break />
      </Sequence>
      <Sequence from={576} durationInFrames={690} name="04 — Showreel">
        <S4Showreel />
      </Sequence>
      <Sequence from={1266} durationInFrames={334} name="05 — Join">
        <S5Join />
      </Sequence>

      <Audio src={staticFile('audio/langwars-mix.wav')} />

      <ScreenFrame />

      {CUTS.map((cut) => (
        <CutOverlay key={cut.at} frame={frame} {...cut} />
      ))}

      <AbsoluteFill
        style={{
          background: C.bg,
          opacity: end,
          zIndex: 400,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
