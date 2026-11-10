# LangWars — Design System

## Mood

Late-night arcade terminal in a back-alley of a neon city. Black void, glowing edges,
cathode scanlines, pixel geometry, a cat that judges you silently. Anime references are
subtle: the mascot is **Neko-9**, a nine-tailed terminal cat; copy uses *nya*, *senpai*,
"nine lives" sparingly.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--bg-0` | `#050510` | page base |
| `--bg-1` | `#0a0a1a` | panels |
| `--bg-2` | `#101028` | raised panels |
| `--line` | `#232347` | borders |
| `--cyan` | `#0ff1ca` | primary neon / success |
| `--magenta` | `#ff2e88` | errors / danger |
| `--violet` | `#8a5cf6` | secondary accent |
| `--amber` | `#ffcf5c` | warnings / event |
| `--text` | `#e8e8ff` | primary text |
| `--muted` | `#8f8fb8` | secondary text |

Fonts: `JetBrains Mono` (body/code), `Space Grotesk` (headings), `Press Start 2P`
(pixel labels only, used sparingly).

## Background

Canvas component draws: slow parallax starfield, drifting perspective grid, occasional
pixel sparks. Pauses on `prefers-reduced-motion`. A CSS scanline overlay is toggleable
from the header (persisted in `localStorage`).

## Components

- `NeonCard` — panel with hover glow, clipped corner.
- `GlowButton` — variants `primary | ghost | danger`.
- `PixelDivider` — repeating pixel blocks.
- `ScoreBadge`, `DifficultyBadge`, `StatusPill`.
- `CatMascot` — inline SVG, expressions `idle | happy | sad | admin`.
- `DiagnosticList` — severity icon, code, line:col, addon id.
- `DiffView` — line diff (`diff` package), `+`/`-` gutters.
- `EmptyState`, `Skeleton`, `Toast` (Zustand-driven).

## Motion

- Neon pulse on primary CTAs (2.8s), subtle float on mascot.
- Verdict reveal: glitch-in panel; cat reacts (happy / sad).
- Respect `prefers-reduced-motion` (all decorative animations disabled).

## Accessibility

- Contrast ≥ 4.5:1 for body text.
- All icons paired with labels or `aria-label`.
- Keyboard-first: editor shortcuts, tab navigation, focus rings in cyan.
- Error states are not color-only (icons + text).
