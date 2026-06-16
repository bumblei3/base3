---
version: alpha
name: Base3 Chess Platform
description: Unified design system for Schach9x9 (9x9 Chess) and Trischach (3-player hexagonal chess with RPS combat). Deep space glassmorphism meets elemental faction aesthetics.
colors:
  primary: "#02040a"
  secondary: "#64748b"
  tertiary: "#6366f1"
  accent: "#ec4899"
  success: "#34d399"
  danger: "#fb7185"
  warning: "#fbbf24"
  info: "#60a5fa"
  bg-app: "#02040a"
  bg-panel: "#0f172a"
  bg-glass: "#0d1321"
  bg-glass-hover: "#111827"
  board-square-dark: "#1e293b"
  board-square-light: "#94a3b8"
  board-square-accent: "#6366f1"
  board-hex-dark: "#1a1a1a"
  board-hex-mid: "#374151"
  board-hex-fire: "#ff4500"
  board-hex-nature: "#10b981"
  board-hex-water: "#3b82f6"
  faction-fire: "#ff4500"
  faction-nature: "#10b981"
  faction-water: "#3b82f6"
  accent-primary: "#6366f1"
  accent-hover: "#818cf8"
  accent-secondary: "#ec4899"
  accent-tertiary: "#10b981"
  text-main: "#f8fafc"
  text-muted: "#94a3b8"
  text-dim: "#64748b"
  text-on-fire: "#ffffff"
  text-on-nature: "#ffffff"
  text-on-water: "#ffffff"
  text-on-dark: "#f8fafc"
  grid-line-square: "#ffffff1a"
  grid-line-hex: "#ffffff26"
  corridor-bg: "#6366f126"
  corridor-border: "#6366f166"
  corridor-bg-hover: "#6366f140"
  corridor-border-hover: "#6366f199"
  theme-blue-board-dark: "#3b5998"
  theme-blue-board-light: "#8b9dc3"
  theme-green-board-dark: "#769656"
  theme-green-board-light: "#eeeed2"
  theme-classic-board-dark: "#475569"
  theme-classic-board-light: "#e2e4e9"
  theme-wood-board-dark: "#b58863"
  theme-wood-board-light: "#f0d9b5"
  theme-dark-board-dark: "#1a1a1a"
  theme-dark-board-light: "#404040"
typography:
  font-main: "Outfit"
  font-mono: "JetBrains Mono"
  h1:
    fontFamily: "Outfit"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  h2:
    fontFamily: "Outfit"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  h3:
    fontFamily: "Outfit"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
  body-lg:
    fontFamily: "Outfit"
    fontSize: "1.125rem"
    lineHeight: 1.5
  body-md:
    fontFamily: "Outfit"
    fontSize: "1rem"
    lineHeight: 1.5
  body-sm:
    fontFamily: "Outfit"
    fontSize: "0.875rem"
    lineHeight: 1.4
  label-caps:
    fontFamily: "Outfit"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.08em"
    textTransform: "uppercase"
  mono-sm:
    fontFamily: "JetBrains Mono"
    fontSize: "0.75rem"
    lineHeight: 1.4
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "48px"
  xxl: "64px"
  cell-size: "min(8vw, 64px)"
  cell-gap: "2px"
  hex-size: "min(6vw, 48px)"
  hex-gap: "1px"
motion:
  transition-fast: "0.2s cubic-bezier(0.4, 0, 0.2, 1)"
  transition-normal: "0.3s cubic-bezier(0.4, 0, 0.2, 1)"
  transition-slow: "0.6s cubic-bezier(0.2, 0.8, 0.2, 1)"
  transition-bounce: "0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
  piece-move-duration: "500ms"
  piece-move-easing: "cubic-bezier(0.4, 0, 0.2, 1)"
  battle-enter: "0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
  battle-exit: "0.2s cubic-bezier(0.4, 0, 1, 1)"
  modal-enter: "0.2s cubic-bezier(0.4, 0, 0.2, 1)"
  modal-exit: "0.15s cubic-bezier(0.4, 0, 1, 1)"
  reduced-transition: "0.01ms linear"
elevation:
  z-background: -1
  z-board: 10
  z-ui: 50
  z-overlay: 100
  z-modal: 200
  z-tooltip: 300
  z-toast: 400
components:
  btn-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
    typography: "{typography.body-md}"
  btn-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.text-main}"
  btn-primary-active:
    backgroundColor: "#4f46e5"
  btn-secondary:
    backgroundColor: "{colors.bg-glass}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
    typography: "{typography.body-md}"
  btn-secondary-hover:
    backgroundColor: "{colors.bg-glass-hover}"
    textColor: "{colors.text-main}"
  btn-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.body-md}"
  btn-ghost-hover:
    backgroundColor: "rgba(255, 255, 255, 0.05)"
    textColor: "{colors.text-main}"
  btn-faction-fire:
    backgroundColor: "{colors.faction-fire}"
    textColor: "{colors.text-on-fire}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
    typography: "{typography.body-md}"
  btn-faction-nature:
    backgroundColor: "{colors.faction-nature}"
    textColor: "{colors.text-on-nature}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
    typography: "{typography.body-md}"
  btn-faction-water:
    backgroundColor: "{colors.faction-water}"
    textColor: "{colors.text-on-water}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
    typography: "{typography.body-md}"
  panel-glass:
    backgroundColor: "{colors.bg-glass}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  panel-glass-hover:
    backgroundColor: "{colors.bg-glass-hover}"
  panel-faction-fire:
    backgroundColor: "rgba(255, 69, 0, 0.15)"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  panel-faction-nature:
    backgroundColor: "rgba(16, 185, 129, 0.15)"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  panel-faction-water:
    backgroundColor: "rgba(59, 130, 246, 0.15)"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  card-default:
    backgroundColor: "{colors.bg-glass}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  modal-overlay:
    backgroundColor: "rgba(0, 0, 0, 0.8)"
  modal-content:
    backgroundColor: "{colors.bg-glass}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
  board-square:
    backgroundColor: "{colors.bg-app}"
  cell-square-dark:
    backgroundColor: "{colors.board-square-dark}"
    width: "{spacing.cell-size}"
    height: "{spacing.cell-size}"
  cell-square-light:
    backgroundColor: "{colors.board-square-light}"
    width: "{spacing.cell-size}"
    height: "{spacing.cell-size}"
  cell-square-accent:
    backgroundColor: "{colors.board-square-accent}"
  cell-square-selected:
    backgroundColor: "{colors.board-square-accent}"
  cell-square-highlight:
    backgroundColor: "{colors.board-square-accent}"
  cell-square-last-move:
    backgroundColor: "{colors.warning}"
  board-hex:
    backgroundColor: "{colors.bg-app}"
  cell-hex:
    width: "{spacing.hex-size}"
    height: "{spacing.hex-size}"
  cell-hex-fire:
    backgroundColor: "{colors.faction-fire}"
  cell-hex-nature:
    backgroundColor: "{colors.faction-nature}"
  cell-hex-water:
    backgroundColor: "{colors.faction-water}"
  cell-hex-selected:
    backgroundColor: "{colors.accent-primary}"
  piece-2d:
    width: "80%"
    height: "80%"
  piece-3d:
    width: "80%"
    height: "80%"
  piece-captured:
    width: "60%"
    height: "60%"
  piece-promotion:
    width: "90%"
    height: "90%"
  input-base:
    backgroundColor: "rgba(255, 255, 255, 0.05)"
    rounded: "{rounded.md}"
    padding: "10px 14px"
    typography: "{typography.body-md}"
  input-focused:
    backgroundColor: "rgba(255, 255, 255, 0.05)"
  select-base:
    backgroundColor: "rgba(255, 255, 255, 0.05)"
    rounded: "{rounded.md}"
    padding: "10px 14px"
    typography: "{typography.body-md}"
  slider-base:
    width: "100%"
    height: "6px"
  toggle-switch:
    width: "48px"
    height: "28px"
    backgroundColor: "rgba(255, 255, 255, 0.1)"
    rounded: "{rounded.full}"
  toggle-switch-checked:
    backgroundColor: "{colors.accent-primary}"
  tooltip:
    backgroundColor: "{colors.bg-panel}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    typography: "{typography.body-sm}"
  toast:
    backgroundColor: "{colors.bg-glass}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md} {spacing.lg}"
  toast-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.text-main}"
  toast-error:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.text-main}"
  toast-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.text-main}"
  tab-list:
    backgroundColor: "transparent"
  tab:
    padding: "{spacing.sm} {spacing.md}"
    textColor: "{colors.text-muted}"
    typography: "{typography.label-caps}"
  tab-active:
    textColor: "{colors.accent-primary}"
  tab-hover:
    textColor: "{colors.text-main}"
  progress-bar:
    height: "6px"
    backgroundColor: "rgba(255, 255, 255, 0.1)"
    rounded: "{rounded.full}"
  progress-fill:
    height: "100%"
    backgroundColor: "{colors.tertiary}"
    rounded: "{rounded.full}"
  progress-fill-panel:
    height: "100%"
    backgroundColor: "{colors.tertiary}"
    rounded: "{rounded.full}"
  eval-bar:
    height: "12px"
    backgroundColor: "rgba(255, 255, 255, 0.1)"
    rounded: "{rounded.full}"
  eval-segment-fire:
    backgroundColor: "{colors.faction-fire}"
    height: "100%"
  eval-segment-nature:
    backgroundColor: "{colors.faction-nature}"
    height: "100%"
  eval-segment-water:
    backgroundColor: "{colors.faction-water}"
    height: "100%"
  ai-thinking-panel:
    backgroundColor: "{colors.bg-glass}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
  spinner:
    width: "48px"
    height: "48px"
    rounded: "{rounded.full}"
  progress-bar-container:
    height: "4px"
    backgroundColor: "rgba(255, 255, 255, 0.1)"
    rounded: "{rounded.full}"
  settings-modal:
    backgroundColor: "{colors.bg-glass}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
    width: "90%"
  settings-tab:
    padding: "{spacing.sm} {spacing.md}"
    textColor: "{colors.text-muted}"
    typography: "{typography.label-caps}"
  settings-tab-active:
    textColor: "{colors.tertiary}"
  settings-tab-hover:
    textColor: "{colors.text-main}"
  setting-row:
    padding: "{spacing.md} 0"
  slider-with-value:
    width: "100%"
  checkbox-label:
    typography: "{typography.body-sm}"
  dropdown-menu:
    backgroundColor: "{colors.bg-panel}"
    rounded: "{rounded.lg}"
    padding: "{spacing.sm}"
    width: "200px"
  dropdown-item:
    padding: "{spacing.sm} {spacing.md}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.md}"
    typography: "{typography.body-sm}"
  dropdown-item-hover:
    backgroundColor: "{colors.bg-glass-hover}"
  scrollbar-thin:
    width: "8px"
    height: "8px"
  scrollbar-track:
    backgroundColor: "rgba(0, 0, 0, 0.1)"
  scrollbar-thumb:
    backgroundColor: "rgba(255, 255, 255, 0.1)"
    rounded: "4px"
  scrollbar-thumb-hover:
    backgroundColor: "rgba(255, 255, 255, 0.2)"
  mobile-breakpoint:
    width: "768px"
  tablet-breakpoint:
    width: "1024px"
  desktop-breakpoint:
    width: "1280px"
  mobile-cell-size:
    width: "min(10vw, 56px)"
  touch-target-min:
    width: "44px"
  touch-target-comfortable:
    width: "48px"
---

## Overview

Base3 Chess Platform is a unified design system for two distinct chess variants: **Schach9x9** (9×9 board with fairy pieces) and **Trischach** (3-player hexagonal chess with Rock-Paper-Scissors combat mechanics).

The visual language bridges two aesthetics:
- **Deep Space Glassmorphism** (Schach9x9): Dark, premium, mysterious. Radial gradients, noise texture, indigo/pink/emerald accents. Glass panels with subtle borders and heavy shadows.
- **Elemental Faction Clarity** (Trischach): Three distinct colors (Fire 🔥, Nature 🌿, Water 🌊) drive every interaction. RPS cycle is the core mental model — always visible, always legible.

Both share: **Outfit** typography, 4px baseline spacing, cubic-bezier easing, touch-friendly 44px+ targets, PWA-first responsive behavior.

---

## Colors

### Core Palette
- **primary (#02040a):** Near-black canvas. Deeper than pure black for reduced eye strain.
- **bg-app (#02040a):** Application background.
- **bg-panel (#0f172a):** Solid panel background (fallback when glass not used).
- **bg-glass (#0d1321):** Semi-transparent slate with backdrop-filter blur.
- **accent-primary / tertiary (#6366f1):** Primary actions, links, focus rings (indigo-500).
- **accent-hover (#818cf8):** Hover state for primary actions.

### Board Colors — Square (Schach9x9)
- **board-square-dark (#1e293b):** Dark squares — slate-800.
- **board-square-light (#94a3b8):** Light squares — slate-400. High contrast for piece legibility.
- **board-square-accent (#6366f1):** Indigo-500 for highlights, corridors, last-move.

### Board Colors — Hex (Trischach)
- **board-hex-dark (#1a1a1a):** Board background.
- **board-hex-mid (#374151):** Grid lines, neutral cells.
- **Faction colors** own the visual hierarchy — every piece, panel, eval bar segment derives from Fire/Nature/Water.

### Faction Colors (Trischach RPS)
| Faction | Hex | Role |
|---------|-----|------|
| Fire 🔥 | #ff4500 | Beats Nature. Aggressive, warm, high energy. |
| Nature 🌿 | #10b981 | Beats Water. Growth, defense, steady. |
| Water 🌊 | #3b82f6 | Beats Fire. Flow, control, calm. |

### Accent System (Shared)
- **accent-primary (Indigo-500):** Primary actions, links, focus rings.
- **accent-hover (Indigo-400):** Hover states.
- **accent-secondary (Pink-500):** Secondary actions, decorative highlights.
- **accent-tertiary (Emerald-500):** Success, positive feedback, Nature-aligned.

### Text Colors
- **text-main (#f8fafc):** Primary text.
- **text-muted (#94a3b8):** Secondary text, placeholders.
- **text-dim (#64748b):** Disabled, low-emphasis.
- **Faction text:** Pure white on faction backgrounds.

### Semantic Colors
- **success:** #34d399 (green-400)
- **danger:** #fb7185 (red-400)
- **warning:** #fbbf24 (amber-400)
- **info:** #60a5fa (blue-400)

### Grid & Corridors
- **grid-line-square:** rgba(255,255,255,0.1)
- **grid-line-hex:** rgba(255,255,255,0.15)
- **corridor-bg/border:** Indigo tints for setup zones.

### Theme Overrides (Schach9x9)
5 built-in themes (blue, green, classic, wood, dark) override board colors only. Glass tokens, typography, spacing remain constant.

---

## Typography

**Outfit** for everything — geometric, compressed tracking, excellent numerals. Weights used: 300 (light), 400 (regular), 600 (semibold), 800 (extrabold).

**JetBrains Mono** for mono: move logs, coordinates, depth values, code snippets.

Scale:
- h1 3rem/1.1 — page titles, modal headers
- h2 2rem/1.2 — section headers, panel titles
- h3 1.5rem/1.3 — sub-sections
- body-lg 1.125rem/1.5 — important body copy
- body-md 1rem/1.5 — default
- body-sm 0.875rem/1.4 — metadata, hints
- label-caps 0.75rem/1.4 uppercase — tab labels, form labels, badges
- mono-sm 0.75rem/1.4 — move notation, coordinates, eval numbers

Tight negative letter-spacing on display sizes only (-0.02em h1, -0.01em h2). Default tracking elsewhere.

---

## Layout

### Spacing Scale (4px baseline)
| Token | Value | Use Case |
|-------|-------|----------|
| xs | 4px | intra-component micro gaps |
| sm | 8px | icon-button gaps, form field pairs |
| md | 16px | standard component padding, card gutters |
| lg | 24px | section gaps, panel margins |
| xl | 48px | major layout breaks, modal vertical rhythm |
| xxl | 64px | full-screen section spacing |

### Board-Specific
- **cell-size:** `min(8vw, 64px)` — responsive square cells
- **cell-gap:** 2px — visible grid lines
- **hex-size:** `min(6vw, 48px)` — responsive hex cells
- **hex-gap:** 1px — tighter hex grid

### Responsive Breakpoints
- Mobile: ≤768px (cell-size → min(10vw, 56px))
- Tablet: 768–1024px
- Desktop: ≥1024px

### Safe Areas
All full-screen containers respect `env(safe-area-inset-*)` for notched devices.

---

## Motion

All transitions use cubic-bezier(0.4, 0, 0.2, 1) (Material's standard easing) unless noted.

| Token | Value | Use Case |
|-------|-------|----------|
| transition-fast | 200ms | hover, focus, tooltip show |
| transition-normal | 300ms | panel expand, tab switch, modal enter |
| transition-slow | 600ms | page transitions, complex choreography |
| transition-bounce | 500ms cubic-bezier(0.34, 1.56, 0.64, 1) | piece drop, badge appear, celebration |

**Piece Movement:** 500ms with ease-out cubic-bezier. Peak height at 50% progress (sine arc).

**Battle Animations:** Separate timing — enter 300ms bounce, exit 200ms ease-in.

**Reduced Motion:** All non-essential animation → 0.01ms linear when `prefers-reduced-motion: reduce`.

---

## Elevation & Depth

Z-index layers are explicit and shared:
| Layer | Value | Purpose |
|-------|-------|---------|
| z-background | -1 | Body noise texture |
| z-board | 10 | Game board |
| z-ui | 50 | Persistent UI (sidebars, headers) |
| z-overlay | 100 | Dropdowns, popovers |
| z-modal | 200 | Modals, combat overlay |
| z-tooltip | 300 | Tooltips |
| z-toast | 400 | Toast notifications |

---

## Shapes

| Token | Value | Use Case |
|-------|-------|----------|
| xs | 4px | buttons (compact), badges |
| sm | 8px | standard buttons, inputs |
| md | 12px | cards, panels, modals (content) |
| lg | 16px | modals, large cards |
| xl | 24px | full-screen sheets |
| full | 9999px | avatars, pills, toggle switches |

---

## Components

### Buttons
- **btn-primary:** Indigo, high-emphasis. One per screen max.
- **btn-secondary:** Glass panel, medium emphasis. Reversible actions.
- **btn-ghost:** Transparent, low emphasis. Toolbar icons.
- **btn-faction-*:** Faction-colored, faction-specific actions only.

All buttons: 44px min-height on mobile, focus ring uses accent-primary.

### Panels / Cards
- **panel-glass:** Default surface. Background + border + shadow implemented in CSS.
- **panel-faction-*:** Faction-colored borders, 15% background tint.
- **card-default:** Simpler than panel-glass, no blur.
- **modal-overlay/content:** Standard modal sandwich.

### Board Components
Square and hex cells are separate token families. Selection, highlight, last-move use background color changes.

### Piece Rendering
2D: SVG, 80% cell size, drop-shadow.
3D: Three.js, cast/receive shadows.

### Form Elements
- Inputs: Glass background, glass border, accent focus ring.
- Selects: Same as inputs, native dropdown.
- Sliders: Indigo accent color.
- Toggles: 48×28px, pill, indigo when checked.

### Tooltips / Toasts
- Tooltip: Dark glass, max-width 280px, z-tooltip.
- Toast: Glass panel, semantic background colors.

### Tabs
- Indicator in accent-primary. Text-muted → accent-primary on active.

### Progress / Eval Bar
- Standard: Indigo fill.
- Trischach eval: Three faction color segments, proportional width.

### AI Thinking Panel
Glass panel, centered spinner (indigo), depth/nodes/best-move text, progress bar with gradient fill.

### Settings Modal
Glass panel, max-width 560px. Tab navigation, setting rows with labels + controls.

### Dropdowns
Glass panel, absolute positioning, z-overlay.

### Scrollbars
Thin (8px), transparent track, subtle thumb.

---

## Do's and Don'ts

- **Do** use token references (`{colors.tertiary}`) everywhere — single source of truth.
- **Do** extend palette via DESIGN.md before adding new colors.
- **Do** respect `prefers-reduced-motion` — test with it enabled.
- **Do** use faction colors ONLY for faction-specific game elements.

- **Don't** hardcode hex values in CSS/JS — update DESIGN.md instead.
- **Don't** mix faction colors outside RPS context (e.g., don't use Fire red for generic error).
- **Don't** nest component variants (`btn-primary.hover` → use `btn-primary-hover` sibling).
- **Don't** introduce new spacing values — use 4px scale.
- **Don't** use pure black (#000000) — use `bg-app` (#02040a) for depth.
- **Don't** skip focus rings — they use accent-primary for visibility.

---

## Accessibility Notes

- Semantic colors calibrated for WCAG AA (4.5:1) on dark backgrounds.
- Focus rings: 3px accent-primary offset.
- Touch targets: 44px minimum, 48px comfortable.
- Color-blind safe: Faction triad differentiable in protanopia/deuteranopia/tritanopia.
- `prefers-reduced-motion` honored globally.
- ARIA labels on all icon-only buttons (emoji + text).
- Primary button contrast: 4.27:1 (AA large text, AA normal text borderline) — consider darkening indigo or using white text weight 600.
- Faction button contrast below AA — acceptable for decorative game UI with emoji labels, but consider adding white stroke or darkening faction colors for critical actions.