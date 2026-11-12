import {Easing, interpolate} from 'remotion';

export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const seg = (frame: number, from: number, to: number) => clamp01((frame - from) / Math.max(1, to - from));

export const inOut = (value: number) => Easing.bezier(0.65, 0, 0.35, 1)(clamp01(value));
export const outExpo = (value: number) => Easing.bezier(0.16, 1, 0.3, 1)(clamp01(value));
export const inOutExpo = (value: number) => Easing.bezier(0.87, 0, 0.13, 1)(clamp01(value));

export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

export const scramble = (frame: number, value: string, seed = 1) => {
  return [...value]
    .map((char, index) => {
      if (char === ' ' || char === '.' || char === ',') return char;
      const pool = '0123456789ABCDEF#%';
      return pool[Math.floor(rand(seed + index + Math.floor(frame / 2) * 13) * pool.length)];
    })
    .join('');
};

export const rise = (
  frame: number,
  start: number,
  duration: number,
  distance = 40,
  easing = outExpo,
) => {
  const progress = easing(seg(frame, start, start + duration));
  return {
    opacity: progress,
    translate: `0px ${interpolate(progress, [0, 1], [distance, 0])}px`,
  };
};

export const drift = (frame: number, speed: number, amplitude: number, phase = 0) =>
  Math.sin(frame * speed + phase) * amplitude;

export const makeShards = (count: number, seed: number) =>
  Array.from({length: count}, (_, index) => {
    const angle = rand(seed + index * 3) * Math.PI * 2;
    const power = 120 + rand(seed + index * 7) * 420;
    return {
      x: Math.cos(angle) * power,
      y: Math.sin(angle) * power - 60,
      size: 3 + rand(seed + index * 11) * 9,
      rotate: rand(seed + index * 13) * 360,
      delay: rand(seed + index * 17) * 5,
      hue: index % 3,
    };
  });

export const NAMES = [
  'answer',
  'total_score',
  'greeting',
  'is_ready',
  'last_winner',
  'offset',
  'mirror',
  'shared_sum',
  'tally',
  'median',
  'window',
  'revision',
];

export const PLAYERS = [
  {name: 'v0id', score: 1840, delta: 12},
  {name: 'nyaa', score: 1795, delta: 4},
  {name: 'nullbyte', score: 1720, delta: -2},
  {name: 'redshift', score: 1690, delta: 8},
  {name: 'pixel_cat', score: 1605, delta: 1},
];
