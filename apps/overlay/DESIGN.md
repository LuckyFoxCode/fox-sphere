---
name: Fox-Sphere Overlay
description: Broadcast marquee — transparent live-stream widgets for OBS
colors:
  bg: "#09090b"
  card: "#18181b"
  popover: "#202024"
  line: "#27272a"
  text-main: "#fafafa"
  text-second: "#a1a1aa"
  text-inverse: "#09090b"
  lime: "#a3e635"
  success: "#22c55e"
  error: "#ef4444"
  warning: "#f97316"
  info: "#3b82f6"
  event-cyan: "#00ffcc"
  event-purple: "#bf55ec"
  event-red: "#ff4757"
  event-amber: "#ffa502"
  event-blue: "#3b82f6"
  event-rose: "#f6339a"
typography:
  display:
    fontFamily: "Rubik, sans-serif"
    fontWeight: 900
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Rubik, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  label:
    fontFamily: "Rubik, sans-serif"
    fontWeight: 700
    letterSpacing: "0.05em"
    textTransform: "uppercase"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  widget-frame:
    backgroundColor: "{colors.bg}"
    borderColor: "{colors.event-blue}"
    rounded: "16px"
    borderWidth: "2px"
    padding: "20px 16px"
  xp-bar-segment:
    backgroundColor: "{colors.event-rose}"
    rounded: "9999px"
---

# Design System: Fox-Sphere Overlay

## Overview

**Creative North Star: "The Broadcast Marquee"**

A glowing, event-driven broadcast layer that floats over live Twitch gameplay. This is an Experience-mode surface — a transparent OBS browser source that shows bot interactions as they happen: XP level-ups, chat chatter, raids, reward redemptions, lottery draws, Pokemon arena moments. The overlay exists to be seen for a heartbeat, then recede so the stream (the actual content) stays the star.

Everything is built on a near-black canvas that reads as "empty" over any game, with card-shaped widgets framed by a thin **neon border in one of six event colors**. Each event type owns a color — cyan, purple, red, amber, blue, rose — so chat and stream can trigger recognizable visual moods at a glance. Widgets arrive and leave with squash-and-stretch zoom/bubble transitions, and the signature WidgetFrame breathes with a slow pulse-glow.

It is deliberately not an app: no nav, no chrome, no persistent background. Full-screen transparent canvas, fixed OBS viewport, no responsive design, no interactivity (viewers act in chat; the overlay only reacts).

**Key Characteristics:**
- Transparent-plus-neon: dark glass-like card over a see-through canvas, rim-lit by a colored border.
- Six event colors map one-to-one to Twitch event types.
- WidgetFrame is the signature: rounded card, colored border, four decorative caps, glowing corner bolts, slow pulse.
- Segmented XP bar (40 rose segments) and gradient rank rings signal progression.
- Motion is quick and expressive on enter/leave, calm while idle (pulse).

## Colors

A near-black neutral base with a single structural accent (lime) and two families of bright event colors. Neutrals define the "background" world; the six event colors are the marquee lights.

### Primary
- **Volt Lime** (#a3e635): The one brand accent used for progress percentages, selection, and focus. Bright, slightly acid — the call-to-attention color.

### Secondary
- **Event Cyan** (#00ffcc): Twitch event color — raids and celebratory moments. Neon aqua, reads as "alive."

### Tertiary
- **Event Purple** (#bf55ec): Reward redemptions & announcements. The "premium/event" hue.
- **Event Red** (#ff4757), **Event Amber** (#ffa502), **Event Blue** (#3b82f6), **Event Rose** (#f6339a): The remaining event palette — one color per widget event type, chosen to stay readable over bright game footage.

### Neutral
- **Void** (#09090b): Background — the transparent canvas base.
- **Carbon** (#18181b): Card surface — the dark glass widget body.
- **Coal** (#202024): Popovers / raised surfaces.
- **Ember** (#27272a): Hairlines and separators.
- **Ivory** (#fafafa): Primary text.
- **Ash** (#a1a1aa): Secondary text.

### Named Rules
**The One-Event-Mood Rule.** A widget carries exactly one event color, chosen by its event, and the rest of its surfaces stay carbon/neutral. Two event colors on one widget dilute the mood.
**The Transparent-Canvas Rule.** Background is always `--bg` at ≤90% opacity over nothing; a widget must never grow so large or bright that it becomes a wall across the stream.

## Typography

**Body Font:** Rubik (sans-serif), variable 300–900.

**Character:** One sporty grotesque used at wide weights with tight tracking for impact. Big moments (level-ups, announcements) go bold and uppercase with a glow; supporting text stays small, quiet, and even.

### Hierarchy
- **Display** (900, 24–30px, tight `-0.025em` + drop-shadow glow): Level-up headlines, event titles. The centerpiece of a widget.
- **Title** (700–800, 18–20px): Widget titles and usernames.
- **Body** (400, 14–16px, ~1.5): Supporting copy, descriptions.
- **Label** (700, 11–12px, `0.05em` uppercase): Micro-labels over icons ("Stream Boost", "Next goal").

## Layout

No page layout — the overlay is a **pinned scene graph** described in `TheOverlay.vue`: a header band (XP), side racks (chat / timer), a center stage for transient events, and a footer. Widgets are individually positioned and independently show/hide.

- **Fixed OBS viewport, no responsive design.** Layout is tuned for a 16:9 full-screen browser source.
- **Widget anatomy** (the signature): outer rounded card (2px event border, soft inner glow, `bg-bg/90`), an inset 6px half-toned frame, four **decorative caps** on edge midpoints, and four glowing **corner bolts**.
- **Spacing** on the 4px base: `16px`-`20px` internal widget padding, `8px` between tight elements, generous margins around independently placed widgets.
- Minimal persistent UI except the XP header; everything transient is centered or edge-anchored.

## Elevation & Depth

**Glow instead of shadow.** In a transparent stream layer, darkness is the canvas and light comes *from* the neon borders. There is essentially no drop-shadow vocabulary — depth is a rim-lit illusion.

Depth is conveyed through:
- **Neon border + inner glow**: the event-colored border (`box-shadow: 0 0 2px <color>`) plus an inset glow.
- **Pulse-glow**: the WidgetFrame slowly breathes its border glow (3s ease-in-out) — ambient aliveness while idle.
- **Tonal layering** between the carbon card and the coal inset frame.

### Named Rules
**The Rim-Light Rule.** Widgets are lit from their colored edge, not from above. Inner and outer glow come from the event color, and flat surfaces stay dark.
**The Breaths-Gently Rule.** Idle widgets pulse softly (they are alive); they never strobe or flash during their resting state — attention is saved for transitions.

## Shapes

Rounded, soft, game-like geometry.

- **Cards / WidgetFrame:** large radius (`rounded-2xl` = 16px), framed by a 2px event border; an inset 6px secondary frame echoes the silhouette.
- **Corner bolts:** small `rounded-full` dots (6px) with an event border.
- **XP bar segments and progress:** full pill (`rounded-full`) — the only fully-rounded structural element.
- **Decorative caps:** the four caps on widget edges are the recurring geometric signature (see Components).

## Components

A small set of custom, event-driven components — no generic UI kit.

### WidgetFrame (signature)
- **Shape:** Rounded 16px card, `min-h-32 min-w-72`, `px-5 py-4`.
- **Fill:** `bg-bg/90` over the transparent canvas.
- **Border:** 2px in the widget's event color, plus `0 0 2px` outer glow and an inset glow.
- **Frame:** inner 6px half-toned band in the event color (`/10` resting, `/1` when glowing).
- **Caps:** four decorative caps at top/bottom/left/right edge midpoints, sized from the `positionY`/`positionX` props.
- **Bolts:** four `rounded-full` 6px dots near the corners, event-bordered.
- **States:** idle = soft pulse-glow (3s); enter/leave handled by the parent transition.

### XP Progress Bar
- **Style:** 40 stacked pills (fully rounded), all neutral/rose, the active count lit from rose with a neon drop-shadow.
- **Progression:** intensity gradient along low→high (`opacity 0.15 → 1.0`), so the filled bar burns brightest at its leading edge.
- **Text:** small `12px` "new/max XP" left, lime percentage right. Smooth `1s` segment transitions.

### LevelBadge / Rank Ring
- **Style:** a 64px SVG **gradient rank ring** (one of ten tier gradients — grays, ambers, teals, purples, reds...) with the level number centered.
- **Meaning:** ring color encodes tier; NEWBIE→OVERLORD progression is read at a glance.

### Event Widgets (Twitch, lottery, Pokemon)
- **Style:** one WidgetFrame per event, its color set by event type (`variant`), content centered.
- **Mood:** bold headline (`font-black`, glow), uppercase micro-label, a small pill badge for the event payload (e.g. reward title).
- **Characters:** chat is tight and fast (`bubble-fade` 0.2s in); announcements and level-ups are bigger and slower.

## Do's and Don'ts

### Do:
- **Do** keep the transparent canvas truly transparent — background at `bg/90` or below so the stream stays visible.
- **Do** use exactly one event color per widget and let its border, glow, and bolts agree on that color.
- **Do** reserve lime for progress/percent and selection — not for event frames.
- **Do** make motion fast and squashy on entry/leave (zoom-in, bubble) but gently pulsing while idle.
- **Do** use `rounded-2xl` (16px) cards and full pills for progress.

### Don't:
- **Don't** add persistent app chrome — no nav bars, no always-on background beyond the translucent card.
- **Don't** mix two event colors in one widget frame; a birthday-cake of colors reads as noise over gameplay.
- **Don't** use heavy drop-shadows to simulate depth; light the edges with the neon glow.
- **Don't** let a widget cover the center of the stream for longer than the event needs it — transient means transient.
- **Don't** use literal `#000` black or pure `#fff` white as surfaces; the system's `--bg` / `--card` / `--text-main` are the approved near-black / ivory.
