import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { displayFont, monoFont } from "../fonts";
import { COLORS } from "../theme";
import { GUY, HomeStage } from "../components/Room";
import { SittingGuy } from "../components/SittingGuy";
import { LangWarsSite } from "./LangWarsSite";

const SITE_WIDTH = 1920;
const SITE_HEIGHT = 1080;
const SCREEN_WIDTH = 1034;
const SCREEN_HEIGHT = 594;
const SITE_SCALE = SCREEN_WIDTH / SITE_WIDTH;
const SITE_TOP = (SCREEN_HEIGHT - SITE_HEIGHT * SITE_SCALE) / 2;



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
  const titleEntry = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
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

        <div
          style={{
            position: "absolute",
            left: 110,
            top: 120,
            width: 640,
            padding: "24px 28px",
            borderRadius: 16,
            border: "1px solid rgba(15, 241, 202, 0.28)",
            background:
              "linear-gradient(160deg, rgba(5, 5, 16, 0.90), rgba(5, 5, 16, 0.76))",
            boxShadow:
              "0 30px 70px rgba(0,0,0,0.55), 0 0 34px rgba(15,241,202,0.10)",
            backdropFilter: "blur(6px)",
            opacity: titleEntry,
            translate: `0px ${16 - titleEntry * 16}px`,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontFamily: monoFont,
              fontSize: 17,
              color: COLORS.amber,
              letterSpacing: 3.4,
            }}
          >
            LANGWARS EVENTS
          </div>
          <div
            style={{
              marginTop: 12,
              fontFamily: displayFont,
              fontSize: 58,
              fontWeight: 700,
              color: COLORS.text,
              lineHeight: 1.02,
              letterSpacing: -1,
              textShadow: "0 2px 18px rgba(0,0,0,0.75)",
            }}
          >
            ENTERTAINING
            <br />
            CHALLENGES
          </div>
          <div
            style={{
              marginTop: 12,
              fontFamily: displayFont,
              fontSize: 22,
              color: COLORS.muted,
              letterSpacing: 0.2,
            }}
          >
            participation is mandatory · fun is not
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background: "#000",
          opacity: fade,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
