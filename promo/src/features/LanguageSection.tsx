import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Sfx, type SfxEvent } from "../audio/Sfx";
import { BasicCaptions } from "../basic-captions.element";
import { FeatureComefrom } from "./FeatureComefrom";
import { FeatureGlobals } from "./FeatureGlobals";
import { FeatureIntegers } from "./FeatureIntegers";
import { FeatureIntro } from "./FeatureIntro";
import { FeatureNoErrors } from "./FeatureNoErrors";

const languageSfx: SfxEvent[] = [
  { src: "whoosh.wav", from: 2, volume: 0.18 },
  { src: "yippee.wav", from: 26, volume: 0.16 },
  { src: "whoosh.wav", from: 96, volume: 0.18 },
  { src: "mouse-click.wav", from: 100, volume: 0.12 },
  { src: "ding.wav", from: 154, volume: 0.24 },
  { src: "switch.wav", from: 186, volume: 0.2 },
  { src: "record-scratch.wav", from: 230, volume: 0.22 },
  { src: "whoosh.wav", from: 276, volume: 0.18 },
  { src: "whip.wav", from: 290, volume: 0.18 },
  { src: "whoosh.wav", from: 330, volume: 0.16 },
  { src: "windows-xp-error.wav", from: 390, volume: 0.2 },
  { src: "ding.wav", from: 434, volume: 0.24 },
  { src: "yippee.wav", from: 458, volume: 0.18 },
];

export const LanguageSection: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0e14" }}>
      <Sequence name="Language intro" durationInFrames={96}>
        <FeatureIntro />
      </Sequence>
      <Sequence name="Globals" from={96} durationInFrames={90}>
        <FeatureGlobals />
      </Sequence>
      <Sequence name="Integers" from={186} durationInFrames={90}>
        <FeatureIntegers />
      </Sequence>
      <Sequence name="Comefrom" from={276} durationInFrames={114}>
        <FeatureComefrom />
      </Sequence>
      <Sequence name="No errors" from={390} durationInFrames={96}>
        <FeatureNoErrors />
      </Sequence>

      <Sfx events={languageSfx} />
    </AbsoluteFill>
  );
};
