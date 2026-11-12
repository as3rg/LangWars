import React from "react";
import { AbsoluteFill } from "remotion";
import { displayFont, monoFont } from "../fonts";
import { COLORS, GRID } from "../theme";

export const FeatureBackground: React.FC<{ accent?: string }> = ({
  accent = COLORS.green,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 820px at 72% 12%, ${accent}24, transparent 62%), radial-gradient(900px 720px at 16% 92%, rgba(88, 166, 255, 0.10), transparent 66%), #0b0e14`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: GRID,
          backgroundSize: "88px 88px",
          opacity: 0.5,
          maskImage:
            "radial-gradient(1200px 860px at 52% 46%, rgba(0,0,0,0.9), transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(1200px 860px at 52% 46%, rgba(0,0,0,0.9), transparent 78%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const FeatureHeader: React.FC<{ index: string }> = ({ index }) => {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 54,
          left: 72,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            background: COLORS.green,
            display: "grid",
            placeItems: "center",
            color: "#07210d",
            fontFamily: displayFont,
            fontSize: 25,
            fontWeight: 700,
          }}
        >
          L
        </div>
        <div
          style={{
            fontFamily: displayFont,
            fontSize: 30,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: 0.2,
          }}
        >
          LWLang{" "}
          <span style={{ color: COLORS.faint, fontSize: 22, fontWeight: 500 }}>
            · the language
          </span>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 62,
          right: 72,
          fontFamily: monoFont,
          fontSize: 16,
          color: COLORS.faint,
          letterSpacing: 2.4,
        }}
      >
        {index}
      </div>
    </>
  );
};

export const FeatureTitle: React.FC<{
  kicker: string;
  title: string;
  subtitle?: string;
  accent?: string;
}> = ({ kicker, title, subtitle, accent = COLORS.green }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: 120,
        top: 142,
        maxWidth: 1250,
      }}
    >
      <div
        style={{
          fontFamily: monoFont,
          fontSize: 17,
          color: accent,
          letterSpacing: 3.4,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          marginTop: 13,
          fontFamily: displayFont,
          fontSize: 82,
          fontWeight: 700,
          color: COLORS.text,
          lineHeight: 0.98,
          letterSpacing: -1.2,
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div
          style={{
            marginTop: 14,
            fontFamily: displayFont,
            fontSize: 25,
            color: COLORS.muted,
            letterSpacing: 0.2,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
};

export const FeatureShell: React.FC<{
  index: string;
  kicker: string;
  title: string;
  subtitle?: string;
  accent?: string;
  children: React.ReactNode;
}> = ({ index, kicker, title, subtitle, accent = COLORS.green, children }) => {
  return (
    <AbsoluteFill style={{ fontFamily: displayFont }}>
      <FeatureBackground accent={accent} />
      <FeatureHeader index={index} />
      <FeatureTitle
        kicker={kicker}
        title={title}
        subtitle={subtitle}
        accent={accent}
      />
      {children}
    </AbsoluteFill>
  );
};

export const Stamp: React.FC<{
  text: string;
  subtext?: string;
  color?: string;
  rotate?: number;
  scale?: number;
  opacity?: number;
}> = ({
  text,
  subtext,
  color = COLORS.green,
  rotate = -8,
  scale = 1,
  opacity = 1,
}) => {
  return (
    <div
      style={{
        border: `7px solid ${color}`,
        borderRadius: 16,
        padding: "12px 30px 9px",
        background: "rgba(11, 14, 20, 0.78)",
        textAlign: "center",
        rotate: `${rotate}deg`,
        scale,
        opacity,
        boxShadow: `0 0 60px ${color}44`,
      }}
    >
      <div
        style={{
          fontFamily: displayFont,
          fontSize: 66,
          fontWeight: 700,
          color,
          letterSpacing: 7,
          lineHeight: 1,
        }}
      >
        {text}
      </div>
      {subtext ? (
        <div
          style={{
            marginTop: 5,
            fontFamily: monoFont,
            fontSize: 16,
            letterSpacing: 4,
            color,
          }}
        >
          {subtext}
        </div>
      ) : null}
    </div>
  );
};
