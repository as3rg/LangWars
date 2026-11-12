import './fonts.css';
import {cancelRender, continueRender, delayRender} from 'remotion';

const handle = delayRender('Loading LangWars fonts');
const probe = 'ОДИН МИР LANGWARS 0123456789';

Promise.all([
  document.fonts.load('400 16px "Press Start 2P"', probe),
  document.fonts.load('400 16px "JetBrains Mono"', probe),
  document.fonts.load('700 16px "JetBrains Mono"', probe),
  document.fonts.load('400 16px Manrope', probe),
  document.fonts.load('700 16px Manrope', probe),
  document.fonts.load('400 16px Unbounded', probe),
  document.fonts.load('600 16px Unbounded', probe),
  document.fonts.load('800 16px Unbounded', probe),
  document.fonts.load('900 16px Unbounded', probe),
])
  .then(() => document.fonts.ready)
  .then(() => continueRender(handle))
  .catch((error) => cancelRender(error));
