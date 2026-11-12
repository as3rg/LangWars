import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { FeatureComefrom } from "./FeatureComefrom";
import { FeatureGlobals } from "./FeatureGlobals";
import { FeatureIntegers } from "./FeatureIntegers";
import { FeatureIntro } from "./FeatureIntro";
import { FeatureNoErrors } from "./FeatureNoErrors";



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

    </AbsoluteFill>
  );
};
