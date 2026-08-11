---
name: realtime
description: The Socket.io contract - where event types live, how the Twitch worker reaches a browser, and where subscriptions may be written.
paths:
  - "apps/backend/src/app.ts"
  - "apps/backend/src/shared/services/**"
  - "apps/frontend/src/composables/sockets/**"
  - "apps/frontend/src/services/**"
  - "packages/types/**"
---

# Realtime

## One typed contract, in packages/types

`ClientToServerEvents` and `ServerToClientEvents` live in `packages/types`. The server is
`new Server<ClientToServerEvents, ServerToClientEvents>(...)`; the client is typed from the
same package. There is no second source of event names.

Adding an event is three steps, in this order:

1. Add the signature to the right interface in `packages/types`.
2. Run `pnpm build:p` - both apps consume the built `dist`, not the source.
3. Emit on the server, subscribe on the client.

Skipping step 2 produces a baffling "property does not exist" on a type you just wrote.

## The worker never emits

The Twitch worker has no `io` handle. It publishes on the in-memory `globalEventBus`, and
`forwardEventToBackend()` POSTs to `/api/internal/events`; the server performs the
`io.emit`.

Keep it that way. In dev the worker is a separate process and could not emit if it wanted
to. In production the two share a process, so an `io.emit` from worker code would work
locally while creating a delivery path that only exists in one of the two shapes.

## Ack callbacks

Request/response over the socket uses an ack callback, the way `stream:get-system-state`
does in `apps/backend/src/app.ts`:

```ts
socket.on("stream:get-system-state", async (_, socketCallback) => {
  const state = await getStreamStatePrepared();
  socketCallback(state);
});
```

The callback's type belongs in `ClientToServerEvents` next to the event.

## Client subscriptions live in composables

Every `socket.on` belongs in a `useXSocket` composable under
`apps/frontend/src/composables/sockets/`, exported from that barrel. Components call the
composable and render the refs it returns:

```ts
const { level, maxXp, isLoading } = useStreamSocket(socket);
```

A raw `socket.on` inside a component leaks its listener on unmount and makes the same
event impossible to reuse in a second widget.

## Payloads must be JSON-serializable

Socket payloads go through `JSON.stringify`, which throws on a `BigInt`.
`TwitchToken.obtainmentTimestamp` is the one in this schema - convert it at the boundary.

## Do not add a new global broadcast

`io.emit` reaches every connected overlay. Phase 1 of
`apps/backend/docs/multi-tenant-architecture.md` replaces broadcast with per-channel
rooms. New event surface should not add another global emit for that work to unwind. If
you genuinely need one now, say so in the change so the phase-1 work finds it.
