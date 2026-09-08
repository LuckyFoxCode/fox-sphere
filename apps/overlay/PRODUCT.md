# Product — Overlay

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **luckyfoxcode** — Twitch streamer, sees this overlay in OBS during live streams
- **Viewers** — see the overlay indirectly through the stream broadcast; they interact via Twitch chat, not through the overlay UI directly

## Product Purpose

The overlay is the visual layer of fox-sphere displayed on stream. It renders real-time widgets — XP/leveling progress, chat messages, stream timer, lottery, Pokemon arena — as transparent browser-source elements in OBS. Its purpose is to enhance stream engagement without obstructing the main content.

## Positioning

A transparent, always-on stream overlay that makes bot interactions visible on screen — not a standalone app, but the visual face of the bot-runtime backend.

## Operating Context

- Runs as an OBS browser source (localhost URL on `:5173`)
- Receives all data via Socket.io from the bot-runtime server on `:3000`
- No direct user interaction — viewers type in Twitch chat; the overlay reacts
- Transparent background, designed to float over game/content capture
- Single-screen layout: header (XP), main area (widgets), sidebar (chat + timer), footer

## Capabilities and Constraints

- **Stream widgets:** XP bar, level badge, stream status
- **Chat widget:** live Twitch chat messages rendered on screen
- **Timer widget:** countdown/elapsed timer, toggled by bot commands
- **Lottery widget:** viewer lottery draws, animated on screen
- **Pokemon arena:** interactive Pokemon battles between viewers
- **User widget:** viewer info display
- Strictly OBS browser source — no mobile, no responsive design needed
- Transparent background, fixed viewport (fullscreen OBS capture)
- No authentication — anyone who knows the URL could view it (acceptable for local dev)
- Tailwind 4 with no custom design system yet (clean slate)

## Brand Commitments

None yet — clean slate. No logo, no palette, no typography defined.

## Evidence on Hand

- Working Vue 3.5 SFCs with Tailwind 4 utility classes
- Socket.io client connected to bot-runtime
- Widget components organized by feature (lottery/, pokemon/, stream/, twitch/, user/)
- No DESIGN.md, no visual tokens, no component library

## Product Principles

1. **Transparent by default** — the overlay must not block the stream content
2. **Reactive, not interactive** — viewers act via chat; the overlay shows results
3. **Composable widgets** — each widget is independent, can be shown/hidden independently
4. **Real-time or nothing** — every visual element updates from live events, never static
