import {Composition} from 'remotion';
import './fonts';
import {LangWarsPromo} from './Promo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LangWarsPromo"
      component={LangWarsPromo}
      durationInFrames={1600}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
