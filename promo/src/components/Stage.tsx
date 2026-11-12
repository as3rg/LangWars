import React from "react";
import { AbsoluteFill, Interactive } from "remotion";
import { displayFont } from "../fonts";
import { COLORS, GRID, STAGE_BACKGROUND } from "../theme";

export const StageBackground: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <AbsoluteFill style={{ background: STAGE_BACKGROUND }} />
      <AbsoluteFill
        style={{
          backgroundImage: GRID,
          backgroundSize: "88px 88px",
          opacity: 0.55,
          maskImage:
            "radial-gradient(1200px 860px at 52% 46%, rgba(0,0,0,0.9), transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(1200px 860px at 52% 46%, rgba(0,0,0,0.9), transparent 78%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const Brand: React.FC = () => {
  return (
    <Interactive.Div
      name="Brand"
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
        <span style={{ color: COLORS.faint, fontWeight: 500 }}>· LWLang</span>
      </div>
    </Interactive.Div>
  );
};

export const TaskChip: React.FC<{ label: string; difficulty: string }> = ({
  label,
  difficulty,
}) => {
  return (
    <Interactive.Div
      name="Task chip"
      style={{
        position: "absolute",
        top: 56,
        right: 72,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "14px 22px",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        background: "rgba(14, 19, 27, 0.82)",
        fontFamily: displayFont,
        fontSize: 24,
        color: COLORS.muted,
      }}
    >
      <span>{label}</span>
      <span style={{ width: 1, height: 22, background: COLORS.border }} />
      <span style={{ color: COLORS.green, fontWeight: 700 }}>{difficulty}</span>
    </Interactive.Div>
  );
};
