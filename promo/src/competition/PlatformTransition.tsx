import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { GUY, HomeStage } from "../components/Room";
import { SittingGuy } from "../components/SittingGuy";
import { Sfx, type SfxEvent } from "../audio/Sfx";
import { LangWarsSite } from "./LangWarsSite";

const SITE_WIDTH = 1920;
const SITE_HEIGHT = 1080;
const SCREEN_WIDTH = 1034;
const SCREEN_HEIGHT = 594;
const SITE_SCALE = SCREEN_WIDTH / SITE_WIDTH;
const SITE_TOP = (SCREEN_HEIGHT - SITE_HEIGHT * SITE_SCALE) / 2;

const transitionSfx: SfxEvent[] = [
  { src: "whoosh.wav", from: 0, volume: 0.18 },
  { src: "switch.wav", from: 22, volume: 0.2 },
  { src: "whoosh.wav", from: 24, volume: 0.25 },
  { src: "anime-wow.wav", from: 84, volume: 0.16 },
  { src: "whoosh.wav", from: 96, volume: 0.2 },
];

export const PlatformTransition: React.FC = () => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [24, 92], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.9, 0.6),
  });
  const scale = 1 + progress * 0.86;
  const tx = -330 * progress;
  const ty = 80 * progress;
  const fade = interpolate(frame, [104, 118], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#050510", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          scale,
          translate: `${tx}px ${ty}px`,
          transformOrigin: "67.2% 42.6%",
        }}
      >
        <HomeStage glow="rgba(15,241,202,0.22)">
          <div
            style={{
              position: "absolute",
              left: 0,
              top: SITE_TOP,
              width: SITE_WIDTH,
              height: SITE_HEIGHT,
              scale: SITE_SCALE,
              transformOrigin: "top left",
              overflow: "hidden",
            }}
          >
            <LangWarsSite />
          </div>
        </HomeStage>
        <div
          style={{
            position: "absolute",
            left: GUY.left,
            top: GUY.top,
            width: GUY.width,
          }}
        >
          <SittingGuy mood="smug" width={GUY.width} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background: "#000",
          opacity: fade,
          pointerEvents: "none",
        }}
      />
      <Sfx events={transitionSfx} />
    </AbsoluteFill>
  );
};
