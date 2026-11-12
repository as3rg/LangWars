import React from "react";
import { Composition } from "remotion";
import { MusicBed } from "./audio/MusicBed";
import { CompetitionSection } from "./competition/CompetitionSection";
import { PlatformTransition } from "./competition/PlatformTransition";
import { LanguageSection } from "./features/LanguageSection";
import { LangWarsPromo } from "./Promo";

const LanguageWithMusic: React.FC = () => (
  <>
    <LanguageSection />
    <MusicBed durationInFrames={486} />
  </>
);

const CompetitionsWithMusic: React.FC = () => (
  <>
    <CompetitionSection />
    <MusicBed durationInFrames={210} />
  </>
);

const PlatformWithMusic: React.FC = () => (
  <>
    <PlatformTransition />
    <MusicBed durationInFrames={120} />
  </>
);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LangWarsPromo"
        component={LangWarsPromo}
        durationInFrames={1176}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="LWLangFeatures"
        component={LanguageWithMusic}
        durationInFrames={486}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="LangWarsCompetitions"
        component={CompetitionsWithMusic}
        durationInFrames={210}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="PlatformZoom"
        component={PlatformWithMusic}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
