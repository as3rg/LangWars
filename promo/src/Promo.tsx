import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { CompetitionSection } from "./competition/CompetitionSection";
import { FinalScene } from "./competition/FinalScene";
import { PlatformTransition } from "./competition/PlatformTransition";
import { LanguageSection } from "./features/LanguageSection";
import { SceneAftermath } from "./scenes/SceneAftermath";
import { SceneFail } from "./scenes/SceneFail";
import { SceneNuke } from "./scenes/SceneNuke";
import { SceneNukeSetup } from "./scenes/SceneNukeSetup";
import { SceneRage } from "./scenes/SceneRage";
import { SceneRival } from "./scenes/SceneRival";



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

      <Sequence name="Final scene" from={1176} durationInFrames={150}>
        <FinalScene />
      </Sequence>

      <Audio
        name="Desired soundtrack"
        src={staticFile("audio.wav")}
        durationInFrames={1326}
      />
    </AbsoluteFill>
  );
};
