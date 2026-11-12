import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { displayFont, monoFont, pixelFont } from "../fonts";

const SITE = {
  bg: "#050510",
  line: "#232347",
  lineSoft: "#1a1a38",
  cyan: "#0ff1ca",
  magenta: "#ff2e88",
  violet: "#8a5cf6",
  violetText: "#b39bff",
  amber: "#ffcf5c",
  text: "#e8e8ff",
  muted: "#8f8fb8",
  dim: "#5f5f86",
} as const;

type Tone = "cyan" | "magenta" | "violet" | "amber";

const TONE_COLOR: Record<Tone, string> = {
  cyan: SITE.cyan,
  magenta: SITE.magenta,
  violet: SITE.violetText,
  amber: SITE.amber,
};

const CatMascot: React.FC<{ size: number }> = ({ size }) => (
  <svg
    viewBox="0 0 64 64"
    width={size}
    height={size}
    shapeRendering="crispEdges"
    aria-hidden="true"
  >
    <g>
      <rect x="30" y="1" width="2" height="6" fill={SITE.cyan} opacity="0.7" />
      <rect x="29" y="0" width="4" height="2" fill={SITE.magenta} opacity="0.9" />

      <rect x="9" y="6" width="13" height="17" fill="#12122c" stroke={SITE.cyan} strokeWidth="1.5" />
      <rect x="42" y="6" width="13" height="17" fill="#12122c" stroke={SITE.cyan} strokeWidth="1.5" />
      <rect x="12" y="10" width="7" height="9" fill={SITE.magenta} opacity="0.55" />
      <rect x="45" y="10" width="7" height="9" fill={SITE.magenta} opacity="0.55" />

      <rect x="8" y="18" width="48" height="36" fill="#12122c" stroke={SITE.cyan} strokeWidth="1.5" />
      <rect x="8" y="18" width="48" height="3" fill={SITE.violet} opacity="0.18" />
      <rect x="28" y="20" width="8" height="2" fill={SITE.violet} />

      <g fill={SITE.cyan}>
        <rect x="18" y="32" width="3" height="3" />
        <rect x="21" y="29" width="3" height="3" />
        <rect x="24" y="32" width="3" height="3" />
        <rect x="37" y="32" width="3" height="3" />
        <rect x="40" y="29" width="3" height="3" />
        <rect x="43" y="32" width="3" height="3" />
      </g>

      <rect x="13" y="40" width="4" height="3" fill={SITE.magenta} opacity="0.35" />
      <rect x="47" y="40" width="4" height="3" fill={SITE.magenta} opacity="0.35" />
      <rect x="30" y="39" width="4" height="3" fill={SITE.magenta} />
      <rect x="32" y="42" width="1.5" height="3" fill={SITE.cyan} opacity="0.65" />
      <g fill={SITE.cyan} opacity="0.7">
        <rect x="27" y="44" width="5" height="1.5" />
        <rect x="32" y="44" width="5" height="1.5" />
        <rect x="27" y="45.5" width="2" height="1.5" />
        <rect x="35" y="45.5" width="2" height="1.5" />
      </g>
      <g fill={SITE.cyan} opacity="0.45">
        <rect x="1" y="37" width="12" height="1" />
        <rect x="3" y="41" width="10" height="1" />
        <rect x="51" y="37" width="12" height="1" />
        <rect x="51" y="41" width="10" height="1" />
      </g>
      <rect x="9" y="50" width="46" height="2" fill={SITE.violet} opacity="0.2" />
      <rect x="10" y="54" width="10" height="2" fill={SITE.cyan} opacity="0.5" />
      <rect x="44" y="54" width="10" height="2" fill={SITE.cyan} opacity="0.5" />
    </g>
  </svg>
);

const Badge: React.FC<{ tone: Tone; children: React.ReactNode }> = ({
  tone,
  children,
}) => {
  const color = TONE_COLOR[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px",
        borderRadius: 6,
        border: `1px solid ${color}55`,
        background: `${color}12`,
        color,
        fontFamily: monoFont,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
};

const SiteHeader: React.FC = () => (
  <div
    style={{
      height: 64,
      borderBottom: `1px solid ${SITE.lineSoft}`,
      background:
        "linear-gradient(to bottom, rgba(5,5,16,0.92), rgba(5,5,16,0.65))",
      backdropFilter: "blur(18px)",
    }}
  >
    <div
      style={{
        width: 1240,
        height: "100%",
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        gap: 26,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ filter: "drop-shadow(0 0 10px rgba(15,241,202,0.4))" }}>
          <CatMascot size={38} />
        </div>
        <div>
          <div
            style={{
              fontFamily: pixelFont,
              fontSize: 12,
              color: SITE.cyan,
              letterSpacing: "0.08em",
              textShadow: "0 0 16px rgba(15,241,202,0.6)",
            }}
          >
            LANGWARS
          </div>
          <div
            style={{
              marginTop: 4,
              fontFamily: monoFont,
              fontSize: 9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: SITE.muted,
            }}
          >
            lwlang arena
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          flex: 1,
        }}
      >
        {["News", "Tasks", "Submissions", "Rating", "World", "Guide"].map(
          (label) => (
            <div
              key={label}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: `1px solid ${
                  label === "News" ? "rgba(15,241,202,0.28)" : "transparent"
                }`,
                background:
                  label === "News" ? "rgba(15,241,202,0.07)" : "transparent",
                color: label === "News" ? SITE.cyan : SITE.muted,
                fontFamily: monoFont,
                fontSize: 12.5,
              }}
            >
              {label}
            </div>
          ),
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            border: `1px solid ${SITE.line}`,
            background: "rgba(16,16,40,0.6)",
            display: "grid",
            placeItems: "center",
            fontFamily: monoFont,
            fontSize: 11,
            color: SITE.muted,
          }}
        >
          EN
        </div>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            border: `1px solid ${SITE.line}`,
            background: "rgba(16,16,40,0.6)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                style={{ width: 16, height: 2, background: SITE.muted }}
              />
            ))}
          </div>
        </div>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            border: `1px solid ${SITE.line}`,
            background: "rgba(16,16,40,0.6)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg viewBox="0 0 20 20" width={15} height={15}>
            <path
              d="M5 8a5 5 0 0 1 10 0v5l2 2H3l2-2V8Z"
              fill="none"
              stroke={SITE.muted}
              strokeWidth="1.5"
            />
            <path d="M8 17h4" stroke={SITE.muted} strokeWidth="1.5" />
          </svg>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "5px 12px 5px 6px",
            border: `1px solid ${SITE.line}`,
            borderRadius: 999,
            background: "rgba(16,16,40,0.7)",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${SITE.cyan}, ${SITE.violet})`,
              display: "grid",
              placeItems: "center",
              fontFamily: monoFont,
              fontSize: 11,
              fontWeight: 800,
              color: SITE.bg,
            }}
          >
            Y
          </div>
          <span style={{ fontFamily: monoFont, fontSize: 12, color: SITE.text }}>
            you
          </span>
          <span style={{ fontFamily: monoFont, fontSize: 12, color: SITE.cyan }}>
            1840
          </span>
        </div>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            border: `1px solid ${SITE.line}`,
            background: "rgba(16,16,40,0.6)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg viewBox="0 0 20 20" width={15} height={15}>
            <path
              d="M4 3 H11 V17 H4"
              fill="none"
              stroke={SITE.muted}
              strokeWidth="1.5"
            />
            <path
              d="M9 10 H18 M15 7 L18 10 L15 13"
              fill="none"
              stroke={SITE.muted}
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
);

const Hero: React.FC<{ frame: number }> = ({ frame }) => (
  <div
    style={{
      position: "relative",
      overflow: "hidden",
      padding: "38px 40px 34px",
      marginBottom: 30,
      borderRadius: 18,
      border: `1px solid ${SITE.line}`,
      background:
        "radial-gradient(600px 260px at 85% 10%, rgba(138,92,246,0.22), transparent 70%), radial-gradient(500px 300px at 8% 100%, rgba(15,241,202,0.13), transparent 70%), linear-gradient(160deg, rgba(17,17,42,0.96), rgba(6,6,18,0.96))",
      boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
    }}
  >
    <AbsoluteFill
      style={{
        backgroundImage:
          "linear-gradient(rgba(15,241,202,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,241,202,0.05) 1px, transparent 1px)",
        backgroundSize: "42px 42px",
        maskImage:
          "radial-gradient(ellipse at 70% 40%, black, transparent 75%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at 70% 40%, black, transparent 75%)",
        pointerEvents: "none",
      }}
    />
    <div style={{ position: "relative", maxWidth: 640 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: pixelFont,
          fontSize: 8,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: SITE.cyan,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            border: `2px solid ${SITE.cyan}`,
          }}
        />
        competitive LWLang arena
      </div>
      <div
        style={{
          margin: "14px 0",
          fontFamily: displayFont,
          fontSize: 50,
          lineHeight: 1.12,
          letterSpacing: "-0.035em",
          color: SITE.text,
        }}
      >
        Write LWLang.
        <br />
        <span
          style={{
            background: `linear-gradient(100deg, ${SITE.cyan}, ${SITE.violet} 55%, ${SITE.magenta})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Break the ladder.
        </span>
      </div>
      <div
        style={{
          maxWidth: 540,
          marginBottom: 22,
          color: "#b9b9dd",
          fontFamily: displayFont,
          fontSize: 15.5,
          lineHeight: 1.55,
        }}
      >
        Solve programming problems in a world shared by every player. Publish a
        solution, change a global name, and see whose code survives.
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 22px",
            borderRadius: 9,
            background: `linear-gradient(120deg, rgba(15,241,202,0.92), rgba(138,92,246,0.92))`,
            color: SITE.bg,
            fontFamily: monoFont,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 0 24px rgba(15,241,202,0.25)",
          }}
        >
          <span style={{ fontFamily: monoFont, fontSize: 13 }}>{">_"}</span>
          Browse tasks
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 22px",
            borderRadius: 9,
            border: `1px solid ${SITE.line}`,
            background: "rgba(16,16,40,0.6)",
            color: SITE.text,
            fontFamily: monoFont,
            fontSize: 14,
          }}
        >
          <span style={{ color: SITE.amber }}>✦</span>
          Current event
        </div>
      </div>
    </div>

    <div
      style={{
        position: "absolute",
        right: 18,
        bottom: -8,
        opacity: 0.95,
        translate: `0px ${Math.sin(frame * 0.08) * 4}px`,
      }}
    >
      <CatMascot size={230} />
    </div>
  </div>
);

const EventStrip: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      padding: "14px 20px",
      marginBottom: 22,
      border: "1px solid rgba(255,207,92,0.3)",
      borderRadius: 12,
      background:
        "linear-gradient(90deg, rgba(255,207,92,0.09), rgba(255,46,136,0.05))",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Badge tone="amber">holiday</Badge>
      <span style={{ fontFamily: displayFont, fontSize: 15, fontWeight: 700, color: SITE.text }}>
        Catnip Night 2026 is LIVE
      </span>
      <span style={{ color: SITE.muted, fontFamily: displayFont, fontSize: 13 }}>
        Solve Catnip Night and climb the event table.
      </span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ fontFamily: monoFont, fontSize: 13, color: SITE.amber }}>
        ends in 7d
      </span>
      <span style={{ fontFamily: monoFont, fontSize: 13, color: SITE.cyan }}>
        enter →
      </span>
    </div>
  </div>
);

const NewsCard: React.FC<{
  tone: Tone;
  accent: string;
  time: string;
  title: string;
  body: string;
  cta?: string;
}> = ({ tone, accent, time, title, body, cta }) => (
  <div
    style={{
      padding: "22px 22px 20px",
      border: `1px solid ${SITE.line}`,
      borderLeft: `2px solid ${accent}`,
      borderRadius: 14,
      background:
        "linear-gradient(165deg, rgba(17,17,42,0.92), rgba(7,7,20,0.94))",
      boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
      minHeight: 226,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <Badge tone={tone}>{tone === "violet" ? "update" : tone === "magenta" ? "event" : "update"}</Badge>
      <span style={{ fontFamily: monoFont, fontSize: 11, color: SITE.dim }}>
        {time}
      </span>
    </div>
    <div
      style={{
        margin: "12px 0 10px",
        fontFamily: displayFont,
        fontSize: 18,
        fontWeight: 700,
        color: SITE.text,
      }}
    >
      {title}
    </div>
    <div
      style={{
        color: SITE.muted,
        fontFamily: displayFont,
        fontSize: 13.5,
        lineHeight: 1.55,
      }}
    >
      {body}
    </div>
    {cta ? (
      <div
        style={{
          marginTop: 14,
          fontFamily: monoFont,
          fontSize: 12,
          color: SITE.cyan,
        }}
      >
        {cta} →
      </div>
    ) : null}
  </div>
);

const SiteNews: React.FC = () => (
  <div>
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 18,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: pixelFont,
            fontSize: 8,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: SITE.cyan,
          }}
        >
          transmission log
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: displayFont,
            fontSize: 22,
            fontWeight: 700,
            color: SITE.text,
          }}
        >
          News &amp; events
        </div>
        <div style={{ marginTop: 6, fontFamily: displayFont, fontSize: 13, color: SITE.muted }}>
          Holiday takeovers, language drops and judge maintenance, straight from
          the arena.
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Badge tone="cyan">10 tasks live</Badge>
        <Badge tone="violet">LWLang v0.3</Badge>
        <Badge tone="amber">shared globals</Badge>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
      <NewsCard
        tone="cyan"
        accent={SITE.cyan}
        time="2d ago"
        title="LWLang v0.3 — the cat speaks"
        body="speak, len and push landed. The speak addon now flags empty speak statements and suspicious cat operands."
        cta="Try speak"
      />
      <NewsCard
        tone="magenta"
        accent={SITE.magenta}
        time="30h ago"
        title="Double rating weekend"
        body="Every first accepted solution this weekend awards its full score to the global ladder. The cat is watching the leaderboard."
      />
      <NewsCard
        tone="violet"
        accent={SITE.violet}
        time="18h ago"
        title="Editor addon API (preview)"
        body="Task authors can now ship addons that run on the AST or on raw source. Diagnostics appear in the gutter and the problems panel."
        cta="Read more"
      />
    </div>

    <div
      style={{
        marginTop: 26,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 18,
      }}
    >
      <div
        style={{
          padding: "20px 22px",
          border: `1px solid ${SITE.line}`,
          borderRadius: 14,
          background:
            "linear-gradient(165deg, rgba(17,17,42,0.92), rgba(7,7,20,0.94))",
        }}
      >
        <div
          style={{
            fontFamily: pixelFont,
            fontSize: 8,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: SITE.cyan,
          }}
        >
          how the arena works
        </div>
        <div
          style={{
            margin: "8px 0 14px",
            fontFamily: displayFont,
            fontSize: 20,
            fontWeight: 700,
            color: SITE.text,
          }}
        >
          Three moves, one ladder
        </div>
        {[
          ["Pick a task.", "Each task has real examples, hidden tests, and its own rules."],
          ["Write & submit.", "Passing code publishes its definitions into the shared world."],
          ["Climb.", "Changes to shared names can break a solution that passed before."],
        ].map(([label, text], index) => (
          <div
            key={label}
            style={{
              display: "flex",
              gap: 8,
              marginBottom: index === 2 ? 0 : 8,
              fontFamily: displayFont,
              fontSize: 13.5,
              color: SITE.muted,
            }}
          >
            <span style={{ color: SITE.cyan, fontFamily: monoFont, fontSize: 12 }}>
              {index + 1}.
            </span>
            <span>
              <strong style={{ color: SITE.text }}>{label}</strong> {text}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "20px 22px",
          border: `1px solid ${SITE.line}`,
          borderRadius: 14,
          background:
            "linear-gradient(165deg, rgba(17,17,42,0.92), rgba(7,7,20,0.94))",
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <CatMascot size={92} />
        <div>
          <div
            style={{
              fontFamily: pixelFont,
              fontSize: 8,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: SITE.cyan,
            }}
          >
            neko-9 // terminal cat
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: displayFont,
              fontSize: 13.5,
              color: SITE.muted,
              lineHeight: 1.55,
            }}
          >
            “Every name has a history. Today’s helpful variable might be
            tomorrow’s attack. Watch the world, and keep your solutions alive.”
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: monoFont,
              fontSize: 11,
              color: SITE.dim,
            }}
          >
            Explore the shared world →
          </div>
        </div>
      </div>
    </div>

    <div
      style={{
        marginTop: 34,
        padding: "22px 0 30px",
        borderTop: `1px solid ${SITE.lineSoft}`,
        display: "flex",
        justifyContent: "space-between",
        fontFamily: monoFont,
        fontSize: 11,
        color: SITE.dim,
      }}
    >
      <span>LANGWARS // one shared world</span>
      <span>Neko-9 says: ship it, senpai.</span>
      <span>LWLang v0.3 · build 2026.11</span>
    </div>
  </div>
);


export const LangWarsSite: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: SITE.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 700px at 12% -10%, rgba(138,92,246,0.14), transparent 60%), radial-gradient(900px 600px at 100% 0%, rgba(15,241,202,0.09), transparent 55%), radial-gradient(800px 700px at 50% 110%, rgba(255,46,136,0.07), transparent 60%), ${SITE.bg}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 420,
          backgroundImage:
            "linear-gradient(rgba(15,241,202,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(15,241,202,0.045) 1px, transparent 1px)",
          backgroundSize: "90px 90px",
          transform: "perspective(600px) rotateX(58deg)",
          transformOrigin: "center bottom",
          maskImage: "linear-gradient(to top, black, transparent 80%)",
          WebkitMaskImage: "linear-gradient(to top, black, transparent 80%)",
          opacity: 0.6,
        }}
      />
      {Array.from({ length: 36 }).map((_, index) => {
        const colors = [SITE.cyan, SITE.violet, SITE.magenta];
        const color = colors[index % 3];
        const size = index % 7 === 0 ? 2 : 1;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: (index * 151 + 80) % 1920,
              top: (index * 89 + 40) % 760,
              width: size,
              height: size,
              background: color,
              opacity: 0.15 + (index % 5) * 0.06,
            }}
          />
        );
      })}

      <SiteHeader />
      <div
        style={{
          width: 1240,
          margin: "0 auto",
          paddingTop: 34,
        }}
      >
        <Hero frame={frame} />
        <EventStrip />
        <SiteNews />
      </div>
    </AbsoluteFill>
  );
};
