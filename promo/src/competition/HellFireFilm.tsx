import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { displayFont } from "../fonts";
import { Flame, PotPerson } from "./CompetitionIcons";

const people = [
  { left: 500, variant: 0 },
  { left: 790, variant: 1 },
  { left: 1080, variant: 2 },
];

export const HellFireFilm: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        background:
          "radial-gradient(ellipse at 50% 44%, #5a1111 0%, #260808 46%, #080407 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 600,
          top: 120,
          width: 720,
          height: 430,
          borderRadius: "50% 50% 42% 42%",
          background: "#090305",
          opacity: 0.55,
          filter: "blur(3px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 610,
          top: 78,
          width: 0,
          height: 0,
          borderLeft: "90px solid transparent",
          borderRight: "90px solid transparent",
          borderBottom: "180px solid #090305",
          rotate: "-18deg",
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 1220,
          top: 78,
          width: 0,
          height: 0,
          borderLeft: "90px solid transparent",
          borderRight: "90px solid transparent",
          borderBottom: "180px solid #090305",
          rotate: "18deg",
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 770,
          top: 300,
          width: 86,
          height: 30,
          borderRadius: "50%",
          background: "#f85149",
          boxShadow: "0 0 50px rgba(248, 81, 73, 0.8)",
          opacity: 0.75,
          filter: "blur(3px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 1070,
          top: 300,
          width: 86,
          height: 30,
          borderRadius: "50%",
          background: "#f85149",
          boxShadow: "0 0 50px rgba(248, 81, 73, 0.8)",
          opacity: 0.75,
          filter: "blur(3px)",
        }}
      />

      {Array.from({ length: 12 }).map((_, index) => {
        const drift = (frame * (1.6 + index * 0.18) + index * 90) % 360;
        const size = 130 + (index % 4) * 70;
        return (
          <div
            key={`smoke-${index}`}
            style={{
              position: "absolute",
              left: 380 + index * 108,
              top: 600 - drift,
              width: size,
              height: size * 0.7,
              borderRadius: "50%",
              background: "rgba(30, 8, 10, 0.28)",
              filter: "blur(18px)",
            }}
          />
        );
      })}

      {Array.from({ length: 10 }).map((_, index) => {
        const drift = (frame * (2 + index * 0.25) + index * 80) % 420;
        return (
          <div
            key={`flame-back-${index}`}
            style={{
              position: "absolute",
              left: 120 + index * 176,
              top: 610 - drift * 0.08,
              opacity: 0.75,
            }}
          >
            <Flame
              width={190 + (index % 4) * 60}
              seed={index * 1.4}
              color={index % 2 === 0 ? "#f85149" : "#c93c37"}
              inner="#ffb86b"
            />
          </div>
        );
      })}

      {people.map((person, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: person.left,
            top: 230 + (index === 1 ? -16 : 0),
            width: 340,
            translate: `0px ${Math.sin(frame * 0.14 + index * 2) * 6}px`,
          }}
        >
          <PotPerson width={340} variant={person.variant} />
        </div>
      ))}

      <div
        style={{
          position: "absolute",
          left: 360,
          top: 440,
          width: 1200,
          height: 480,
        }}
      >
        <svg
          viewBox="0 0 900 360"
          width={1200}
          height={480}
          style={{ overflow: "visible" }}
        >
          <path
            d="M120 70 C100 230 200 330 450 330 C700 330 800 230 780 70 Z"
            fill="#141a24"
            stroke="#3a4656"
            strokeWidth="10"
          />
          <path
            d="M150 90 C140 220 220 300 450 300 C680 300 760 220 750 90"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="18"
          />
          <path
            d="M120 90 C80 140 80 210 115 260"
            fill="none"
            stroke="#3a4656"
            strokeWidth="20"
            strokeLinecap="round"
          />
          <path
            d="M780 90 C820 140 820 210 785 260"
            fill="none"
            stroke="#3a4656"
            strokeWidth="20"
            strokeLinecap="round"
          />
          <ellipse cx="450" cy="70" rx="360" ry="62" fill="#3a4656" />
          <ellipse cx="450" cy="76" rx="326" ry="48" fill="#1b232d" />
          <ellipse cx="450" cy="78" rx="300" ry="38" fill="#b8382f" />
          <ellipse cx="450" cy="78" rx="276" ry="29" fill="#f0883e" />
          <ellipse cx="430" cy="72" rx="200" ry="18" fill="#ffb86b" opacity="0.55" />
        </svg>
      </div>

      {Array.from({ length: 24 }).map((_, index) => {
        const rise = (frame * (1.2 + (index % 5) * 0.35) + index * 38) % 170;
        const size = 10 + (index % 6) * 5;
        const x = 500 + ((index * 83) % 920);
        return (
          <div
            key={`bubble-${index}`}
            style={{
              position: "absolute",
              left: x,
              top: 615 - rise,
              width: size,
              height: size,
              borderRadius: "50%",
              border: "2px solid rgba(255, 227, 176, 0.55)",
              background: "rgba(255, 184, 107, 0.22)",
              opacity: 1 - rise / 190,
            }}
          />
        );
      })}

      <div
        style={{
          position: "absolute",
          left: 900,
          top: 556,
          width: 4,
          height: 128,
          background: "rgba(210, 153, 34, 0.5)",
          rotate: "12deg",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 1018,
          top: 556,
          width: 4,
          height: 128,
          background: "rgba(210, 153, 34, 0.5)",
          rotate: "-12deg",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 770,
          top: 688,
          width: 380,
          height: 82,
          borderRadius: 6,
          background:
            "linear-gradient(180deg, #a87945 0%, #6b4a2a 55%, #4a301a 100%)",
          border: "3px solid #c9a06a",
          rotate: "-3deg",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 18px 30px rgba(0,0,0,0.45)",
        }}
      >
        <span
          style={{
            fontFamily: displayFont,
            fontSize: 34,
            fontWeight: 700,
            color: "#2a1a08",
            letterSpacing: 4,
          }}
        >
          TEAM BUILDING
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          left: 1200,
          top: 248,
          rotate: "4deg",
        }}
      >
        <div
          style={{
            position: "relative",
            padding: "18px 28px",
            borderRadius: 24,
            background: "#f7f1e3",
            border: "5px solid #151a21",
            fontFamily: displayFont,
            fontSize: 40,
            fontWeight: 700,
            color: "#151a21",
            boxShadow: "0 16px 30px rgba(0,0,0,0.35)",
          }}
        >
          this is fine
          <div
            style={{
              position: "absolute",
              left: 40,
              bottom: -27,
              width: 0,
              height: 0,
              borderLeft: "18px solid transparent",
              borderRight: "0 solid transparent",
              borderTop: "30px solid #151a21",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 45,
              bottom: -17,
              width: 0,
              height: 0,
              borderLeft: "12px solid transparent",
              borderRight: "0 solid transparent",
              borderTop: "21px solid #f7f1e3",
            }}
          />
        </div>
      </div>

      {Array.from({ length: 18 }).map((_, index) => {
        const rise = (frame * (1.8 + (index % 4) * 0.5) + index * 53) % 780;
        const size = 4 + (index % 4) * 3;
        return (
          <div
            key={`ember-${index}`}
            style={{
              position: "absolute",
              left: 160 + ((index * 107) % 1600),
              top: 980 - rise,
              width: size,
              height: size,
              borderRadius: "50%",
              background: index % 3 === 0 ? "#ffe3b0" : "#f0883e",
              opacity: 0.75,
              boxShadow: "0 0 14px rgba(248, 81, 73, 0.7)",
            }}
          />
        );
      })}

      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={`flame-front-${index}`}
          style={{
            position: "absolute",
            left: 60 + index * 280,
            top: 858 + (index % 3) * 24,
            opacity: 0.9,
          }}
        >
          <Flame
            width={230 + (index % 3) * 70}
            seed={index * 2.1}
            color="#f85149"
            inner="#ffb86b"
          />
        </div>
      ))}

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.68) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
