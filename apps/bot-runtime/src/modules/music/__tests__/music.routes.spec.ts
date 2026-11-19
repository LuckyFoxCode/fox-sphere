import type { MusicNowPlaying } from "@fox-sphere/types";
import express from "express";
import type { Server } from "socket.io";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerMusicRoutes } from "../music.routes";
import { getNowPlaying, setNowPlaying } from "../music.state";

const TOKEN = "test-token";

const state: MusicNowPlaying = {
  title: "Black Friday - pretty like the sun",
  artist: "Lost Frequencies, Tom Odell",
  album: "Black Friday (pretty like the sun)",
  artwork: "data:image/png;base64,AAAA",
  durationMs: 145_650,
  positionMs: 72_000,
  isPlaying: true,
  sentAt: 1_000_000,
};

// Роут настоящий, Express настоящий, фейковый только сокет: проверяется проводка -
// порядок парсеров, коды ответов и то, что в `io.emit` уходит слитое состояние.
const emitted: Array<[string, MusicNowPlaying | null]> = [];

const io = {
  emit: (event: string, payload: MusicNowPlaying | null) => {
    emitted.push([event, payload]);
  },
} as unknown as Server;

const app = express();
registerMusicRoutes(app, io);

const server = app.listen(0);
const port = (server.address() as AddressInfo).port;
const url = `http://127.0.0.1:${port}/api/music/state`;

const post = (body: unknown, token: string | null = TOKEN) =>
  fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token === null ? {} : { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });

const previousToken = process.env.MUSIC_AGENT_TOKEN;

beforeEach(() => {
  process.env.MUSIC_AGENT_TOKEN = TOKEN;
  setNowPlaying(null);
  emitted.length = 0;
});

afterEach(() => {
  if (previousToken === undefined) delete process.env.MUSIC_AGENT_TOKEN;
  else process.env.MUSIC_AGENT_TOKEN = previousToken;
});

afterAll(() => {
  server.close();
});

describe("POST /api/music/state", () => {
  it("отвечает 503, когда токен на сервере не задан", async () => {
    delete process.env.MUSIC_AGENT_TOKEN;

    expect((await post({ state })).status).toBe(503);
    expect(emitted).toHaveLength(0);
  });

  it("отвечает 401 на чужой токен и ничего не рассылает", async () => {
    expect((await post({ state }, "wrong")).status).toBe(401);
    expect(emitted).toHaveLength(0);
  });

  it("отвечает 401 без заголовка авторизации", async () => {
    expect((await post({ state }, null)).status).toBe(401);
  });

  it("отвечает 400 на тело не по схеме", async () => {
    const response = await post({ state: { ...state, title: "" } });

    expect(response.status).toBe(400);
    expect(emitted).toHaveLength(0);
  });

  it("отвечает 204 и рассылает состояние", async () => {
    expect((await post({ state })).status).toBe(204);
    expect(emitted).toEqual([["music:now-playing", state]]);
    expect(getNowPlaying()).toEqual(state);
  });

  it("рассылает состояние с прежней обложкой на сердцебиении", async () => {
    await post({ state });
    emitted.length = 0;

    await post({ state: { ...state, artwork: null, positionMs: 87_000 } });

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.[1]?.artwork).toBe(state.artwork);
    expect(emitted[0]?.[1]?.positionMs).toBe(87_000);
  });

  it("принимает null и гасит состояние", async () => {
    await post({ state });
    emitted.length = 0;

    expect((await post({ state: null })).status).toBe(204);
    expect(emitted).toEqual([["music:now-playing", null]]);
    expect(getNowPlaying()).toBeNull();
  });

  it("отказывает до разбора тела: без токена битый JSON даёт 401, а не 400", async () => {
    // Парсер тела ответил бы 400 на невалидный JSON. Значит 401 здесь - это
    // доказательство, что проверка токена стоит впереди и тело не читается.
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });

    expect(response.status).toBe(401);
  });

  it("принимает обложку больше 100 КБ, которые не пропускает глобальный парсер", async () => {
    const big = `data:image/png;base64,${"A".repeat(200_000)}`;

    expect((await post({ state: { ...state, artwork: big } })).status).toBe(204);
    expect(emitted[0]?.[1]?.artwork).toBe(big);
  });
});
