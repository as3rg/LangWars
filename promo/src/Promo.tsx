import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { MusicBed } from "./audio/MusicBed";
import { Sfx, type SfxEvent } from "./audio/Sfx";
import { BasicCaptions } from "./basic-captions.element";
import { CompetitionSection } from "./competition/CompetitionSection";
import { PlatformTransition } from "./competition/PlatformTransition";
import { LanguageSection } from "./features/LanguageSection";
import { SceneAftermath } from "./scenes/SceneAftermath";
import { SceneFail } from "./scenes/SceneFail";
import { SceneNuke } from "./scenes/SceneNuke";
import { SceneNukeSetup } from "./scenes/SceneNukeSetup";
import { SceneRage } from "./scenes/SceneRage";
import { SceneRival } from "./scenes/SceneRival";

const narrativeSfx: SfxEvent[] = [
  { src: "whoosh.wav", from: 0, volume: 0.18 },
  { src: "windows-xp-error.wav", from: 44, volume: 0.35 },
  { src: "whoosh.wav", from: 85, volume: 0.2 },
  { src: "ding.wav", from: 104, volume: 0.28 },
  { src: "triggered.wav", from: 145, volume: 0.25 },
  { src: "whoosh.wav", from: 185, volume: 0.2 },
  { src: "mouse-click.wav", from: 219, volume: 0.18 },
  { src: "vine-boom.wav", from: 283, volume: 0.4 },
  { src: "record-scratch.wav", from: 300, volume: 0.25 },
  { src: "whoosh.wav", from: 321, volume: 0.18 },
  { src: "fah.wav", from: 330, volume: 0.24 },
];

export const LangWarsPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0e14" }}>
      <Sequence name="Speed" durationInFrames={585} playbackRate={585 / 360}>
        <Sequence name="Fail" durationInFrames={138}>
          <SceneFail />
        </Sequence>
        <Sequence name="Rival" from={138} durationInFrames={96}>
          <SceneRival />
        </Sequence>
        <Sequence name="Rage" from={234} durationInFrames={66}>
          <SceneRage />
        </Sequence>
        <Sequence name="Nuke setup" from={300} durationInFrames={90}>
          <SceneNukeSetup />
        </Sequence>
        <Sequence name="Nuke" from={390} durationInFrames={132}>
          <SceneNuke />
        </Sequence>
        <Sequence name="Aftermath" from={522} durationInFrames={63}>
          <SceneAftermath />
        </Sequence>

        <BasicCaptions
          name="Subtitles"
          width={1280}
          style={{
            position: "absolute",
            left: 320,
            bottom: 64,
          }}
          captions={[
            {
              text: " Day 47. Still can't pass Two Sum.",
              startMs: 500,
              endMs: 4400,
              timestampMs: 2300,
              confidence: null,
              pageBreakAfter: true,
            },
            {
              text: " That random just solved it... and got ABOVE me?!",
              startMs: 5000,
              endMs: 7900,
              timestampMs: 6400,
              confidence: null,
              pageBreakAfter: true,
            },
            {
              text: " Time to ruin his life.",
              startMs: 8400,
              endMs: 10000,
              timestampMs: 9200,
              confidence: null,
              pageBreakAfter: true,
            },
            {
              text: " One variable. That's all it takes.",
              startMs: 10400,
              endMs: 12400,
              timestampMs: 11400,
              confidence: null,
              pageBreakAfter: true,
            },
            {
              text: " Nuke incoming.",
              startMs: 13200,
              endMs: 15200,
              timestampMs: 14200,
              confidence: null,
              pageBreakAfter: true,
            },
            {
              text: " He redefined my variables. My life is over.",
              startMs: 15800,
              endMs: 18800,
              timestampMs: 17300,
              confidence: null,
              pageBreakAfter: true,
            },
          ]}
        />
      </Sequence>

      <Sequence name="Language" from={360} durationInFrames={486}>
        <LanguageSection />
      </Sequence>

      <Sequence name="Platform transition" from={846} durationInFrames={120}>
        <PlatformTransition />
      </Sequence>

      <Sequence name="Competitions" from={966} durationInFrames={210}>
        <CompetitionSection />
      </Sequence>

      <Sfx events={narrativeSfx} />
      <MusicBed durationInFrames={1176} />
    </AbsoluteFill>
  );
};
