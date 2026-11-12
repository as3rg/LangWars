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

      <BasicCaptions
        name="Language subtitles"
        width={1280}
        style={{
          position: "absolute",
          left: 320,
          bottom: 64,
        }}
        captions={[
          {
            text: " We provide the modern, advanced language.",
            startMs: 300,
            endMs: 1600,
            timestampMs: 950,
            confidence: null,
            pageBreakAfter: true,
          },
          {
            text: " It's mostly held together by duct tape.",
            startMs: 1600,
            endMs: 2900,
            timestampMs: 2250,
            confidence: null,
            pageBreakAfter: true,
          },
          {
            text: " Only global variables. One flat namespace.",
            startMs: 3200,
            endMs: 4500,
            timestampMs: 3850,
            confidence: null,
            pageBreakAfter: true,
          },
          {
            text: " A shelf where you can find nothing but 128 globals. Good, structured code.",
            startMs: 4500,
            endMs: 6100,
            timestampMs: 5300,
            confidence: null,
            pageBreakAfter: true,
          },
          {
            text: " Integer overflow wraps in [-1,000,000, 1,000,000].",
            startMs: 6300,
            endMs: 7500,
            timestampMs: 6900,
            confidence: null,
            pageBreakAfter: true,
          },
          {
            text: " Logical as fuck.",
            startMs: 7500,
            endMs: 9000,
            timestampMs: 8250,
            confidence: null,
            pageBreakAfter: true,
          },
          {
            text: " The best control flow operator: comefrom.",
            startMs: 9400,
            endMs: 11000,
            timestampMs: 10200,
            confidence: null,
            pageBreakAfter: true,
          },
          {
            text: " So intuitive. Nobody knows where it comes from.",
            startMs: 11000,
            endMs: 12600,
            timestampMs: 11800,
            confidence: null,
            pageBreakAfter: true,
          },
          {
            text: " Errors? Never heard of them.",
            startMs: 13000,
            endMs: 14400,
            timestampMs: 13700,
            confidence: null,
            pageBreakAfter: true,
          },
          {
            text: " We just ignore them. Maximum reliability.",
            startMs: 14400,
            endMs: 15900,
            timestampMs: 15150,
            confidence: null,
            pageBreakAfter: true,
          },
        ]}
      />
      <Sfx events={languageSfx} />
    </AbsoluteFill>
  );
};
