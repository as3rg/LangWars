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
