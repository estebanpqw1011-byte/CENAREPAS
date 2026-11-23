---
name: Artisanal Precision Dark
colors:
  surface: '#161310'
  surface-dim: '#161310'
  surface-bright: '#3d3835'
  surface-container-lowest: '#110d0b'
  surface-container-low: '#1f1b18'
  surface-container: '#231f1c'
  surface-container-high: '#2e2926'
  surface-container-highest: '#393430'
  on-surface: '#eae1db'
  on-surface-variant: '#e2bfb2'
  inverse-surface: '#eae1db'
  inverse-on-surface: '#342f2c'
  outline: '#a98a7e'
  outline-variant: '#5a4138'
  surface-tint: '#ffb599'
  primary: '#ffb599'
  on-primary: '#5a1c00'
  primary-container: '#f66018'
  on-primary-container: '#4f1700'
  inverse-primary: '#a73a00'
  secondary: '#4ae176'
  on-secondary: '#003915'
  secondary-container: '#00b954'
  on-secondary-container: '#004119'
  tertiary: '#efc200'
  on-tertiary: '#3c2f00'
  tertiary-container: '#cea700'
  on-tertiary-container: '#4e3e00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#ffb599'
  on-primary-fixed: '#370e00'
  on-primary-fixed-variant: '#7f2b00'
  secondary-fixed: '#6bff8f'
  secondary-fixed-dim: '#4ae176'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005321'
  tertiary-fixed: '#ffe083'
  tertiary-fixed-dim: '#eec200'
  on-tertiary-fixed: '#231b00'
  on-tertiary-fixed-variant: '#574500'
  background: '#161310'
  on-background: '#eae1db'
  surface-variant: '#393430'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
  label-xs:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a high-performance, developer-grade operational hub tailored for the culinary production floor. It unites the uncompromising density and speed of tools like Linear and Railway with the sensory depth of heritage corn craftsmanship. The interface targets plant managers, mill operators, recipe formulators, and distribution coordinators who require real-time visibility over yields, fermentation timing, moisture metrics, and batch traceability.

The aesthetic philosophy balances **Technical Dark Mode Precision** with **Artisanal Tactility**:
- Crisp, deliberate layouts with dense information hierarchies.
- Warm, organic undertones that replace cold tech slates with roasted masa, ember, and hearth cues.
- Subtle inner radial glows, hairline borders, and satin glass surfaces that signal modern craft rather than clinical enterprise software.

## Colors

The palette discards generic blue-tinted grays in favor of deep roasted charcoal and warm umber tones.

### Color Roles
- **Primary (`#EA580C` - Terracotta Ember):** Drives primary actions, active production runs, batch initiation, and critical focus states. Supported by deeper tones (`#E25822`) on interactive press and vibrant highlights (`#F97316`) for hover states.
- **Secondary (`#22C55E` - Fresh Plant Leaf):** Indicates completed QA checkpoints, healthy fermentation readouts, positive stock deltas, and nominal machine states. Deepened by `#15803D` for solid badges and high-contrast indicators.
- **Tertiary (`#FACC15` - Toasted Corn Gold):** Signals warnings, in-progress cook cycles, thermal adjustments, and intermediate batch states. Supported by rich amber `#EAB308`.
- **Neutral Core (`#14110F`, `#1C1815`, `#24201C`):** Base canvas and tiered card surfaces built from roasted brown-charcoal. Background elements incorporate hairline borders with warm amber alpha overlays (`rgba(245, 158, 11, 0.12)`) rather than stark white edges.

## Typography

The typographic hierarchy combines geometric structure with technical clarity:
- **Headlines (Space Grotesk):** Provides mechanical balance and sharp character, reinforcing modern software precision with distinct geometric terminals.
- **Body & Data Prose (Geist):** Delivers clean readability across dense production lists, recipe specifications, and ERP inventory matrices.
- **Metrics, Timers & Batch Codes (JetBrains Mono):** Reserved for SKU identifiers, batch numbers, thermal telemetry, grain weights, and mill runtime durations. Ensures tabular data remains visually locked and aligned across rapid real-time updates.

## Layout & Spacing

The layout is built on a 12-column fluid grid system optimized for information-dense monitoring screens, rugged tablet floor stations, and mobile QA inspections.

### Breakpoints & Flow
- **Mobile (&lt; 768px):** 4 columns with `1rem` margins and gutters. Multi-step production flows collapse to single-column full-width feeds; metric cards condense into swipeable telemetry chips.
- **Tablet (768px – 1024px):** 8 columns with `1.5rem` margins. Split views between recipe ingredient lists and live batch timers.
- **Desktop (&gt; 1024px):** 12 columns with a fixed maximum canvas width of `1600px` and `2rem` margins. Supports split multi-panel workspaces (e.g., Live Mixers on left, Quality Audit Queue on center, Grain Silo Yields on right).

Layout density defaults to compact padding within tables, operational toolbars, and batch status monitors, preserving viewport real estate for continuous data streams.

## Elevation & Depth

Visual hierarchy relies on warm glass surfaces, tiered surface lightness, and focused ember halos rather than deep diffuse dropshadows:

- **Surface Levels:**
  - **Base Canvas (`#14110F`):** Deep roasted floor, zero elevation.
  - **Level 1 Panels (`#1C1815`):** Subordinate containers and persistent sidebars. Bordered by `1px solid rgba(245, 158, 11, 0.08)`.
  - **Level 2 Cards & Flyouts (`#24201C`):** Focus blocks, production card triggers, and metrics. Enhanced with a backdrop blur of `12px` and `rgba(36, 32, 28, 0.8)` semi-transparency.
  - **Level 3 Modals & Overlays (`#2E2924`):** Emergency halts, recipe formulation drawers, and critical audit modals. Supported by an ambient shadow: `0 16px 40px -8px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(234, 88, 12, 0.2)`.

- **Artisanal Hearth Glow:** Active elements (active kneading cycle, current bake temperature reach) project a subtle directional radial glow: `0 0 24px -4px rgba(234, 88, 12, 0.25)`. Completed states emit a soft chlorophyll halo: `0 0 20px -4px rgba(34, 197, 94, 0.2)`.

## Shapes

The design system standardizes on generous `rounded-2xl` radii for cards, modal dialogs, and primary metric panels, evoking the soft, hand-formed curvature of an artisan arepa while maintaining software discipline:
- Large interactive containers and structural cards: `1rem` (16px / `rounded-2xl`).
- Inputs, segmented tabs, and standard action buttons: `0.5rem` (8px / `rounded-lg`).
- Status pills, telemetry tags, and batch badges: full-pill curve (`9999px`) for quick visual separation against rectilinear data rows.

## Components

### Buttons
- **Primary:** Solid `#EA580C` background, crisp white label, hairline top inner highlight `inset 0 1px 0 0 rgba(255, 255, 255, 0.2)`. Hover shifts to `#F97316` with a soft terracotta ambient aura.
- **Secondary:** Surface tint `#24201C` with `1px solid rgba(234, 88, 12, 0.25)`. Text in `#F3F4F6`. Hover activates a subtle warm glow and lifts surface brightness.
- **Destructive / Halt:** Deep crimson-tinted charcoal base with `#EF4444` borders and mono-spaced warning labels.

### Input Fields & Selects
- Inputs feature `#1C1815` backgrounds enclosed by `1px solid rgba(245, 158, 11, 0.14)`.
- Internal font uses `Geist` for text and `JetBrains Mono` for numeric weights (kg, hydration %, bake temp).
- Focus states apply an active `#EA580C` border transition accompanied by an inner shadow ring: `0 0 0 1px #EA580C, 0 0 12px rgba(234, 88, 12, 0.15)`.

### Cards & Telemetry Blocks
- Production metrics sit within `rounded-2xl` cards constructed with warm glassmorphism (`backdrop-filter: blur(16px)` over `#1C1815/90`).
- Headers display `JetBrains Mono` uppercase tracking labels (e.g., `BATCH #M-804`) alongside dynamic secondary status indicators (Leaf Green dot for nominal hydration).

### Chips & Badges
- Compact pill-shaped tokens with low-opacity tonal backdrops:
  - **Nominal QA / Yield Pass:** `rgba(34, 197, 94, 0.12)` background, `#22C55E` border, `#86EFAC` text.
  - **Bake & Toast Monitor:** `rgba(250, 204, 21, 0.12)` background, `#FACC15` border, `#FDE047` text.
  - **Oven Idle / Alert:** `rgba(234, 88, 12, 0.12)` background, `#EA580C` border, `#FDBA74` text.

### Checkboxes & Radios
- Box frame styled with `rounded-md`, tinted `#24201C`, and rimmed with `rgba(245, 158, 11, 0.2)`. Checked states snap immediately to solid `#EA580C` with a stark `#14110F` interior check glyph.

### Specialized Production Components
- **Hydration & Viscosity Gauges:** Linear micro-bars embedded inside table rows, leveraging segmented track ticks with glowing terracotta progress indicators.
- **Batch State Timeline:** Monospaced vertical stepper with interconnected glowing node indicators tracking stages: *Nixtamalization &rarr; Stone Milling &rarr; Kneading &rarr; Portioning &rarr; Hearth Bake &rarr; Flash Chill*.