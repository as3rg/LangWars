import voiceManifest from "../generated/voice-manifest.json";

export type Lang = "en" | "ru";

export const FPS = 30;

export type VoiceId = keyof (typeof voiceManifest)["en"];

export const voiceDuration = (lang: Lang, id: string): number => {
  const table = voiceManifest[lang] as Record<string, number>;
  return table[id] ?? 0;
};

export type SceneDef = {
  id: string;
  seconds: number;
  narration: string;
  neko?: string;
  caption: string;
};

export const SCENE_DEFS: SceneDef[] = [
  { id: "s1", seconds: 13, narration: "s1", neko: "s1-neko", caption: "s1" },
  { id: "s2", seconds: 17, narration: "s2", caption: "s2" },
  { id: "s3", seconds: 20, narration: "s3", neko: "s3-neko", caption: "s3" },
  { id: "s4", seconds: 23, narration: "s4", neko: "s4-neko", caption: "s4" },
  { id: "s5", seconds: 16, narration: "s5", caption: "s5" },
  { id: "s6", seconds: 18, narration: "s6", caption: "s6" },
  { id: "s7", seconds: 13, narration: "s7", neko: "s7-neko", caption: "s7" },
];

export const NARRATION_LEAD = 0.45;

export type SceneTiming = SceneDef & {
  index: number;
  from: number;
  durationInFrames: number;
  narrationStart: number;
  nekoStart: number;
};

export const buildScenes = (lang: Lang): SceneTiming[] => {
  let cursor = 0;
  return SCENE_DEFS.map((def, index) => {
    const durationInFrames = Math.round(def.seconds * FPS);
    const from = cursor;
    cursor += durationInFrames;
    const narrationStart = NARRATION_LEAD;
    const nekoStart =
      narrationStart + voiceDuration(lang, def.narration) + 0.1;
    return {
      ...def,
      index,
      from,
      durationInFrames,
      narrationStart,
      nekoStart,
    };
  });
};

export const TOTAL_SECONDS = SCENE_DEFS.reduce((sum, s) => sum + s.seconds, 0);
