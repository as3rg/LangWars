import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadPixel } from "@remotion/google-fonts/PressStart2P";

const display = loadDisplay("normal", { subsets: ["latin"] });
const mono = loadMono("normal", { subsets: ["latin"] });
const pixel = loadPixel("normal", { subsets: ["latin"] });

export const displayFont = display.fontFamily;
export const monoFont = mono.fontFamily;
export const pixelFont = pixel.fontFamily;
