---
name: Fox-Sphere Admin
description: Control-room panel for managing multi-tenant Twitch channels
colors:
  background: "oklch(1 0 0)"
foreground: "oklch(0.205 0 0)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.205 0 0)"
  popover: "oklch(1 0 0)"
  secondary: "oklch(0.97 0 0)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  accent: "oklch(0.97 0 0)"
  primary: "oklch(0.205 0 0)"
  primary-foreground: "oklch(0.985 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
  border: "oklch(0.922 0 0)"
  input: "oklch(0.922 0 0)"
  ring: "oklch(0.708 0 0)"
  sidebar: "oklch(0.985 0 0)"
  sidebar-foreground: "oklch(0.205 0 0)"
typography:
  body:
    fontFamily: "Rubik, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "Rubik, sans-serif"
    fontSize: "14px"
    fontWeight: 500
rounded:
  md: "0.625rem"
  sm: "calc(0.625rem - 4px)"
  lg: "calc(0.625rem + 4px)"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-default:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "calc(0.625rem - 4px)"
    height: "36px"
    padding: "16px 8px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "calc(0.625rem - 4px)"
    height: "36px"
    padding: "16px 8px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "white"
    rounded: "calc(0.625rem - 4px)"
    height: "36px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    borderColor: "{colors.input}"
    rounded: "calc(0.625rem - 4px)"
    height: "36px"
    padding: "12px 4px"
---

# Design System: Fox-Sphere Admin

## Overview

**Creative North Star: "The Control Room"**

A quiet, precise operations panel for a growing network of Twitch channels. This is an Operate-mode surface: the admin gets in, reads state, and gets out. The visual language is neutral, low-saturation, and almost entirely secondary — a plain light theme with a single restrained accent, dark mode offered as a first-class equal, and a slim collapsible sidebar as the persistent frame.

Density is high but calm. Rows and cards carry multiple data points, yet the system never shouts: the palette is achromatic oklch neutrals, shapes are softly rounded, and accents appear only where they mean something (a destructive action, an active nav item, a focus ring). The lime accent inherited from fox-sphere's identity is reserved almost exclusively for selection backgrounds and focus outlines — a deliberate rarification so the stream-brand stays, but does not clutter an operations tool.

**Key Characteristics:**
- Operate-first: scanability and consistency outrank expression.
- Neutral dominant, one rare accent (lime) for selection/focus.
- Soft 0.625rem radii; shadcn-derived component vocabulary.
- First-class light and dark themes via oklch token set.
- Slim collapsible sidebar frame; content area is the focus.

## Colors

An achromatic, low-chroma neutral system in OKLCH, with one borrowed brand accent. Colors are grouped into Material-derived roles; neutrals carry the UI, the lime accent is spent sparingly.

### Primary
- **Graphite** (oklch(0.205 0 0)): The primary button fill, dark sidebar text. Near-black neutral — the system's single "brand" action surface in light mode.

### Secondary
- **Ash** (oklch(0.97 0 0)): Secondary/accent button fills, muted surfaces, hover blankets.

### Neutral
- **Paper** (oklch(1 0 0)): Background, cards, popovers. The default canvas.
- **Ink** (oklch(0.205 0 0)): Foreground text — primary reading color.
- **Smoke** (oklch(0.556 0 0)): Muted-foreground: secondary text, placeholders, captions.
- **Pearl** (oklch(0.985 0 0)): Sidebar surface, slightly shaded from paper.
- **Hairline** (oklch(0.922 0 0)): Borders, dividers, input strokes.
- **Destructive Red** (oklch(0.577 0.245 27.325)): Destructive actions and errors. The one saturated status color.

### Named Rules
**The Rare Accent Rule.** Lime (`#a3e635`) appears only as selection background and the focus ring — never as a primary button or wholesale surface. Its scarcity is what keeps an operations tool from drifting into stream-brand decoration.

## Typography

**Body Font:** Rubik (sans-serif), variable weight 300–900.

**Character:** A single, modern grotesque — geometric but friendly at the corners. No display face; hierarchy is achieved through weight and size within Rubik rather than a second family. This keeps scan-heavy tables and forms uniformly legible.

### Hierarchy
- **Headline** (500–600, 18–20px, ~1.3): Page titles. Rarely needed — most views are data-first.
- **Title** (500, 16px, ~1.4): Section headers and card titles.
- **Body** (400, 14px, ~1.5): Default text, table cells, descriptions. Comfortable line length 60–75ch for prose.
- **Label** (500, 14px, normal): Field labels, nav items, buttons. Weight (not size) distinguishes interactive labels from body text.

## Layout

A fixed app shell: slim **sidebar** (expandable/collapsible) on the left as the persistent navigation frame, with the **content region** to its right holding the active view. Content is a flexible column that can carry dense tables, channel lists, and creation forms.

- **No fixed page grid** beyond the shell — views flow to the content width.
- **Spacing rhythm** on the 4px base: compact `8px` gutters between tightly-related controls, `16px` between form fields, `24px` between major sections.
- **Dark mode** is a `.dark` variant toggled on the shell; layout is identical in both themes. Density is unchanged — this is an expert tool, not a mobile-first experience.

## Elevation & Depth

**Flat by default.** This system uses tonal layering and hairlines to separate surfaces, not shadows. Cards and the sidebar sit one step of neutral above the background (paper vs. pearl) with a hairline border; there is no drop-shadow vocabulary in regular use.

Depth is conveyed through:
- **Surface tone shifts** (background → card → popover/sheet) at increasing lightness.
- **Hairlines** (`--border`) as the primary separator.
- **`shadow-xs`** appears only on outline buttons and inputs as a micro-elevation cue for affordance, and on popovers/sheets to lift them above the page.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat and separated by color tone and hairlines. Shadows lift only temporary layers — popovers, sheets, dialogs — and never decorate resting cards.

## Shapes

Soft, friendly radii across the board, anchored to a single `--radius: 0.625rem` token from which both smaller and larger steps derive:

- **`sm`** (`calc(0.625rem - 4px)` = 6px): Buttons, inputs, small controls.
- **`md` / `lg`** (`0.625rem`, `calc(0.625rem + 4px)`): Cards, sheets, dialogs — larger containers.

No hard 0px corners, no pills for structural components. Borders are 1px hairlines in the neutral `--border` color.

## Components

A shadcn-derived component vocabulary — Button, Input, Select, Checkbox, Field, Badge, Separator, Sheet, Sidebar — static in layout, neutral in color, alive only in their state responses.

### Buttons
- **Shape:** Softly rounded (`sm` = 6px), slim heights.
- **Primary:** Graphite fill (`--primary`), light text (`--primary-foreground`); hover darkens to `--primary/90`.
- **Hover / Focus:** `bg-primary/90` on hover; focus-visible shows a 3px ring in `--ring` with a hairline border. Transitions are quick (`transition-all`).
- **Outline:** Paper fill with hairline border; hover floods to accent surface.
- **Ghost:** Borderless, text-only; hover to accent surface.
- **Destructive:** Destructive Red fill, white text for destructive confirmation.
- **Sizes:** `default` h-9 (36px), `xs`/`sm`/`lg`/`icon` variants; icons render at 16px via `size-4`.

### Inputs / Fields
- **Style:** Transparent fill over the page, hairline `--input` border, `sm` radius, h-9 (36px), 3–4px horizontal padding, placeholder in muted-foreground.
- **Focus:** Border shifts to `--ring`, plus a 3px `--ring/50` focus ring.
- **Error:** `aria-invalid` — border and ring switch to Destructive Red.
- **Disabled:** 50% opacity, pointer-events off.

### Sidebar
- **Style:** Slim `--sidebar` surface (pearl in light, graphite in dark), hairline border separator, icon-plus-label menu items.
- **State:** Active item fills `--sidebar-accent`; collapsed mode shows icons only with right-aligned tooltips.

### Badge
- **Style:** Pill/rounded tag, neutral fill with muted text; used for channel or status labels. Present but understated.

## Do's and Don'ts

### Do:
- **Do** keep surfaces flat and separated by tone + hairline; reserve shadows for popovers, sheets, and dialogs.
- **Do** spend lime only on selection backgrounds and the focus ring — never as a primary surface or button.
- **Do** use the `sm` (6px) radius on controls and the larger steps on containers; keep the 0.625rem anchor consistent.
- **Do** design for both light and dark from the oklch token set — a control whose contrast dies in dark mode is a bug.

### Don't:
- **Don't** add a second typeface or a decorative display font; Rubik carries all hierarchy.
- **Don't** reuse the stream overlay's saturated event palette (cyan/rose/amber…) in the admin — saturated color here means destructive or active-nav only.
- **Don't** introduce drop-shadows on resting cards to "lift" them; use tone and hairline.
- **Don't** convert a stream-brand decorative widget style (neon frames, pulse) into an admin component.
