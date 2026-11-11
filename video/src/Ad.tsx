import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Lang, buildScenes } from "./lib/script";
import { COLORS, FONTS } from "./lib/theme";
import { Background, GlitchCuts } from "./components/Background";
import { SceneShell } from "./components/SceneShell";
import { AudioLayer } from "./components/AudioLayer";
import { Scene1 } from "./scenes/Scene1";
import { Scene2 } from "./scenes/Scene2";
import { Scene3 } from "./scenes/Scene3";
import { Scene4 } from "./scenes/Scene4";
import { Scene5 } from "./scenes/Scene5";
import { Scene6 } from "./scenes/Scene6";
import { Scene7 } from "./scenes/Scene7";

const SCENE_ACCENTS = [
  COLORS.cyan,
  COLORS.cyan,
  COLORS.magenta,
  COLORS.amber,
  COLORS.violet,
  COLORS.cyan,
  COLORS.magenta,
];

export type AdProps = { lang: Lang };

export const Ad: React.FC<AdProps> = ({ lang }) => {
  const scenes = buildScenes(lang);
  const frame = useCurrentFrame();
  const current = scenes.find(
    (scene) => frame >= scene.from && frame < scene.from + scene.durationInFrames,
  );
  const accent = SCENE_ACCENTS[current?.index ?? 0];

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg0,
        color: COLORS.text,
        fontFamily: FONTS.mono,
        overflow: "hidden",
      }}
    >
      <Background accent={accent} intensity={1} />

      {scenes.map((scene) => {
        const SceneComponent = [
          Scene1,
          Scene2,
          Scene3,
          Scene4,
          Scene5,
          Scene6,
          Scene7,
        ][scene.index];
        return (
          <Sequence
            key={scene.id}
            name={`scene-${scene.id}`}
            from={scene.from}
            durationInFrames={scene.durationInFrames}
          >
            <SceneShell duration={scene.durationInFrames}>
              <SceneComponent lang={lang} duration={scene.durationInFrames} />
            </SceneShell>
          </Sequence>
        );
      })}

      <GlitchCuts boundaries={scenes.slice(1).map((scene) => scene.from)} />
      <AudioLayer lang={lang} scenes={scenes} />
    </AbsoluteFill>
  );
};
