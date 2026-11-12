import React from "react";
import { useCurrentFrame } from "remotion";
import { tokenize } from "../components/tokenize";
import { monoFont } from "../fonts";
import { COLORS } from "../theme";
import { FeatureShell, Stamp } from "./FeatureChrome";

type Node = {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly color?: string;
};

const nodes: Node[] = [
  { x: 80, y: 200, label: "start" },
  { x: 330, y: 110, label: "parse_input" },
  { x: 600, y: 250, label: "check" },
  { x: 880, y: 120, label: "loop" },
  { x: 1220, y: 200, label: "target", color: COLORS.red },
  { x: 470, y: 430, label: "error" },
  { x: 820, y: 480, label: "fallback" },
  { x: 1250, y: 440, label: "exit" },
  { x: 180, y: 400, label: "source_a" },
  { x: 1060, y: 360, label: "source_b" },
 ];

type FlowLine = {
  readonly text: string;
  readonly tone?: "call" | "target" | "after";
};

const codeLines: FlowLine[] = [
  { text: "fn solve(target_value) {" },
  { text: "  let x = target_value;" },
  { text: "  comefrom found;", tone: "call" },
  { text: "  x = x + 1;", tone: "after" },
  { text: "  return x;" },
  { text: "}" },
  { text: "" },
  { text: "fn other() {" },
  { text: "found:", tone: "target" },
  { text: "  return 42;" },
  { text: "}" },
];

const paths = [
  { d: "M 80 200 C 160 120, 240 100, 330 110", color: COLORS.green },
  { d: "M 330 110 C 500 40, 740 40, 880 120", color: COLORS.blue },
  { d: "M 880 120 C 980 120, 1120 160, 1220 200", color: COLORS.amber },
  { d: "M 80 200 C 100 300, 300 430, 470 430", color: COLORS.red },
  { d: "M 600 250 C 640 350, 740 450, 820 480", color: COLORS.blue },
  { d: "M 470 430 C 700 520, 1020 300, 1220 200", color: COLORS.purple },
  { d: "M 180 400 C 260 500, 700 260, 880 120", color: COLORS.green },
  { d: "M 1060 360 C 900 420, 500 240, 330 110", color: COLORS.amber },
  { d: "M 1250 440 C 1100 520, 700 380, 600 250", color: COLORS.red },
  { d: "M 820 480 C 600 540, 200 480, 80 200", color: COLORS.blue },
  { d: "M 1220 200 C 1000 160, 760 360, 470 430", color: COLORS.green },
  { d: "M 880 120 C 800 220, 780 380, 820 480", color: COLORS.red },
  { d: "M 330 110 C 400 180, 520 220, 600 250", color: COLORS.blue },
  { d: "M 600 250 C 800 180, 1050 240, 1220 200", color: COLORS.amber },
  { d: "M 1060 360 C 1150 400, 1200 430, 1250 440", color: COLORS.purple },
  { d: "M 80 200 C 260 240, 440 280, 600 250", color: COLORS.green },
  { d: "M 880 120 C 1010 240, 1120 360, 1250 440", color: COLORS.red },
  { d: "M 470 430 C 600 380, 700 430, 820 480", color: COLORS.blue },
  { d: "M 1220 200 C 900 40, 400 300, 180 400", color: COLORS.amber },
  { d: "M 1250 440 C 1000 560, 500 20, 330 110", color: COLORS.purple },
];

export const FeatureComefrom: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <FeatureShell
      index="03 / 04"
      kicker="SPECIAL FEATURE 03"
      title="COME FROM"
      subtitle="THE BEST CONTROL FLOW OPERATOR · NOBODY KNOWS WHERE IT COMES FROM"
      accent={COLORS.blue}
    >
      <div
        style={{
          position: "absolute",
          left: 100,
          top: 310,
          width: 1720,
          height: 570,
          borderRadius: 20,
          border: `1px solid ${COLORS.borderSoft}`,
          background: "rgba(10, 14, 21, 0.62)",
          overflow: "visible",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 24,
            top: 20,
            right: 24,
            display: "flex",
            fontFamily: monoFont,
            fontSize: 14,
            letterSpacing: 2,
            color: COLORS.faint,
          }}
        >
          <span>EXECUTION GRAPH</span>
          <span style={{ marginLeft: "auto" }}>
            {paths.length} EDGES · {nodes.length} NODES · 0 CLARITY
          </span>
        </div>

        <svg
          viewBox="0 0 1720 570"
          width={1720}
          height={570}
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          <defs>
            <marker
              id="comefrom-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 Z" fill="#8b949e" />
            </marker>
          </defs>

          {paths.map((path, index) => (
            <path
              key={index}
              d={path.d}
              fill="none"
              stroke={path.color}
              strokeWidth={index % 5 === 0 ? 3.5 : 2}
              strokeDasharray="10 10"
              strokeDashoffset={-frame * (1.5 + (index % 4) * 0.4)}
              opacity={0.55}
              markerEnd="url(#comefrom-arrow)"
            />
          ))}

          {[
            { x: 700, y: 336, text: "comefrom target", rotate: -5 },
            { x: 1010, y: 300, text: "comefrom 42", rotate: 7 },
            { x: 300, y: 302, text: "comefrom loop", rotate: -4 },
            { x: 860, y: 540, text: "comefrom start", rotate: 5 },
          ].map((label, index) => (
            <text
              key={index}
              x={label.x}
              y={label.y}
              fill="rgba(230, 237, 243, 0.62)"
              fontFamily="monospace"
              fontSize="16"
              textAnchor="middle"
              transform={`rotate(${label.rotate} ${label.x} ${label.y})`}
            >
              {label.text}
            </text>
          ))}

          {nodes.map((node, index) => {
            const appear = Math.min(1, Math.max(0, (frame - index * 3) / 8));
            return (
              <g key={index} opacity={appear}>
                <rect
                  x={node.x - 95}
                  y={node.y - 32}
                  width={190}
                  height={64}
                  rx={13}
                  fill="rgba(20, 27, 37, 0.95)"
                  stroke={
                    node.color
                      ? `${node.color}aa`
                      : "rgba(139, 148, 158, 0.42)"
                  }
                  strokeWidth={2}
                />
                <circle
                  cx={node.x - 70}
                  cy={node.y}
                  r={5}
                  fill={node.color ?? COLORS.green}
                />
                <text
                  x={node.x + 10}
                  y={node.y + 7}
                  fill={node.color ?? COLORS.text}
                  fontFamily="monospace"
                  fontSize="20"
                  textAnchor="middle"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div
        style={{
          position: "absolute",
          left: 1240,
          top: 330,
          width: 560,
          height: 520,
          borderRadius: 18,
          border: `1px solid rgba(88, 166, 255, 0.35)`,
          background: "rgba(10, 14, 21, 0.97)",
          boxShadow: "0 34px 90px rgba(0, 0, 0, 0.55)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 52,
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            borderBottom: `1px solid ${COLORS.borderSoft}`,
            background: COLORS.panelRaised,
          }}
        >
          <span
            style={{
              fontFamily: monoFont,
              fontSize: 14,
              color: COLORS.muted,
            }}
          >
            control_flow.lw
          </span>
          <span
            style={{
              marginLeft: "auto",
              padding: "5px 10px",
              borderRadius: 999,
              border: `1px solid ${COLORS.border}`,
              fontFamily: monoFont,
              fontSize: 11,
              color: COLORS.green,
              letterSpacing: 0.6,
            }}
          >
            LWLang
          </span>
        </div>

        <div style={{ position: "relative", padding: "16px 20px 0" }}>
          {codeLines.map((line, index) => {
            const tone = line.tone;
            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: 30,
                  marginLeft: -8,
                  paddingLeft: 8,
                  borderRadius: 4,
                  borderLeft: `3px solid ${
                    tone === "call"
                      ? COLORS.blue
                      : tone === "target"
                        ? COLORS.green
                        : tone === "after"
                          ? "rgba(88, 166, 255, 0.5)"
                          : "transparent"
                  }`,
                  background:
                    tone === "call"
                      ? "rgba(88, 166, 255, 0.12)"
                      : tone === "target"
                        ? "rgba(63, 185, 80, 0.12)"
                        : tone === "after"
                          ? "rgba(88, 166, 255, 0.05)"
                          : "transparent",
                }}
              >
                <span
                  style={{
                    width: 28,
                    flexShrink: 0,
                    textAlign: "right",
                    marginRight: 12,
                    fontFamily: monoFont,
                    fontSize: 13,
                    color: "#3d4a5a",
                  }}
                >
                  {index + 1}
                </span>
                <span
                  style={{
                    fontFamily: monoFont,
                    fontSize: 16,
                    whiteSpace: "pre",
                  }}
                >
                  {tokenize(line.text).map((token, tokenIndex) => (
                    <span
                      key={tokenIndex}
                      style={{
                        color: token.color,
                        fontStyle: token.italic ? "italic" : "normal",
                      }}
                    >
                      {token.text}
                    </span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>

        <svg
          viewBox="0 0 560 520"
          width={560}
          height={520}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          <defs>
            <marker
              id="flow-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 Z" fill={COLORS.blue} />
            </marker>
          </defs>
          <path
            d="M 380 323 C 490 300, 490 196, 380 173"
            fill="none"
            stroke={COLORS.blue}
            strokeWidth={3}
            strokeDasharray="8 7"
            strokeDashoffset={-frame * 1.6}
            markerEnd="url(#flow-arrow)"
            opacity={0.85}
          />
          <circle cx={380} cy={323} r={5} fill={COLORS.green} />
        </svg>

        <div
          style={{
            position: "absolute",
            left: 404,
            top: 236,
            padding: "6px 10px",
            borderRadius: 6,
            background: "rgba(88, 166, 255, 0.12)",
            border: "1px solid rgba(88, 166, 255, 0.3)",
            fontFamily: monoFont,
            fontSize: 11,
            letterSpacing: 1,
            color: COLORS.blue,
          }}
        >
          jump
        </div>

        <div
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            bottom: 18,
            fontFamily: monoFont,
            fontSize: 12,
            color: COLORS.faint,
          }}
        >
          reads top to bottom, mostly
        </div>
      </div>

      <div style={{ position: "absolute", left: 820, top: 700 }}>
        <Stamp
          text="INTUITIVE"
          subtext="SOMEHOW READABLE"
          color={COLORS.green}
          rotate={-6}
          scale={0.54}
        />
      </div>
    </FeatureShell>
  );
};
