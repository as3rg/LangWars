import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { displayFont, monoFont } from "../fonts";
import { COLORS } from "../theme";

export const CompetitionBackground: React.FC<{ accent?: string }> = ({
  accent = COLORS.amber,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 900px at 50% -10%, ${accent}33, transparent 62%), radial-gradient(900px 720px at 10% 100%, rgba(248, 81, 73, 0.10), transparent 66%), #0b0e14`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.025) 0 2px, transparent 2px 92px)",
          opacity: 0.55,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -260,
          left: 160,
          width: 720,
          height: 1300,
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0.07), transparent 68%)",
          rotate: "-14deg",
          filter: "blur(12px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -260,
          right: 160,
          width: 720,
          height: 1300,
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0.07), transparent 68%)",
          rotate: "14deg",
          filter: "blur(12px)",
        }}
      />
    </AbsoluteFill>
  );
};

export const CompetitionHeader: React.FC<{ index: string }> = ({ index }) => {
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
          LangWars{" "}
          <span style={{ color: COLORS.faint, fontSize: 22, fontWeight: 500 }}>
            · events
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

export const CompetitionTitle: React.FC<{
  kicker: string;
  title: string;
  subtitle?: string;
  accent?: string;
}> = ({ kicker, title, subtitle, accent = COLORS.amber }) => {
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

export const CompetitionShell: React.FC<{
  index: string;
  kicker: string;
  title: string;
  subtitle?: string;
  accent?: string;
  children: React.ReactNode;
}> = ({ index, kicker, title, subtitle, accent, children }) => {
  return (
    <AbsoluteFill style={{ fontFamily: displayFont }}>
      <CompetitionBackground accent={accent} />
      <CompetitionHeader index={index} />
      <CompetitionTitle
        kicker={kicker}
        title={title}
        subtitle={subtitle}
        accent={accent}
      />
      {children}
    </AbsoluteFill>
  );
};

export const Confetti: React.FC<{ count?: number; opacity?: number }> = ({
  count = 32,
  opacity = 0.8,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      {Array.from({ length: count }).map((_, index) => {
        const x = (index * 137 + 60) % 1920;
        const y = ((index * 211 + frame * (1 + (index % 3))) % 1200) - 80;
        const rotate = (index * 47 + frame * (1 + (index % 2))) % 360;
        const color = [
          COLORS.green,
          COLORS.amber,
          COLORS.red,
          COLORS.blue,
          "#f2cc60",
        ][index % 5];
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 8 + (index % 4) * 3,
              height: 4 + (index % 3) * 2,
              borderRadius: 2,
              background: color,
              rotate: `${rotate}deg`,
              opacity: 0.8,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const LiveBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const blink = Math.floor(frame / 12) % 2 === 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 15px",
        borderRadius: 999,
        border: `1px solid rgba(248, 81, 73, 0.45)`,
        background: "rgba(248, 81, 73, 0.12)",
        fontFamily: monoFont,
        fontSize: 14,
        letterSpacing: 1.4,
        color: COLORS.red,
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: COLORS.red,
          opacity: blink ? 1 : 0.25,
        }}
      />
      LIVE
    </div>
  );
};
