import React from "react";
import { Composition } from "remotion";
import { CompetitionSection } from "./competition/CompetitionSection";
import { FinalScene } from "./competition/FinalScene";
import { PlatformTransition } from "./competition/PlatformTransition";
import { LanguageSection } from "./features/LanguageSection";
import { LangWarsPromo } from "./Promo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LangWarsPromo"
        component={LangWarsPromo}
        durationInFrames={1326}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="LWLangFeatures"
        component={LanguageSection}
        durationInFrames={486}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="LangWarsCompetitions"
        component={CompetitionSection}
        durationInFrames={210}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="PlatformZoom"
        component={PlatformTransition}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="FinalScene"
        component={FinalScene}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
