import { Composition } from "remotion";
import { Ad } from "./Ad";
import { ensureFonts } from "./lib/fonts";
import { FPS, TOTAL_SECONDS } from "./lib/script";

ensureFonts();

const durationInFrames = Math.round(TOTAL_SECONDS * FPS);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LangWarsAd-Landscape"
        component={Ad}
        durationInFrames={durationInFrames}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ lang: "en" }}
      />
      <Composition
        id="LangWarsAd-Vertical"
        component={Ad}
        durationInFrames={durationInFrames}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ lang: "en" }}
      />
      <Composition
        id="LangWarsAd-Landscape-RU"
        component={Ad}
        durationInFrames={durationInFrames}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ lang: "ru" }}
      />
      <Composition
        id="LangWarsAd-Vertical-RU"
        component={Ad}
        durationInFrames={durationInFrames}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ lang: "ru" }}
      />
    </>
  );
};
