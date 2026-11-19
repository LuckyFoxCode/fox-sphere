import type { MusicNowPlaying } from "@fox-sphere/types";
import { describe, expect, it } from "vitest";
import { mergeNowPlaying } from "../music.state";

const track: MusicNowPlaying = {
  title: "Black Friday - pretty like the sun",
  artist: "Lost Frequencies, Tom Odell",
  album: "Black Friday (pretty like the sun)",
  artwork: "data:image/png;base64,AAAA",
  durationMs: 145_650,
  positionMs: 72_000,
  isPlaying: true,
  sentAt: 1_000_000,
};

describe("mergeNowPlaying", () => {
  it("сохраняет null, когда сессии нет", () => {
    expect(mergeNowPlaying(track, null)).toBeNull();
  });

  it("принимает первое состояние с обложкой", () => {
    expect(mergeNowPlaying(null, track)).toEqual(track);
  });

  it("переносит обложку на сердцебиение того же трека", () => {
    // Агент шлёт artwork только при смене трека, а сердцебиение - без него:
    // иначе 250 КБ base64 уезжали бы каждые 15 секунд.
    const beat: MusicNowPlaying = { ...track, artwork: null, positionMs: 87_000 };

    expect(mergeNowPlaying(track, beat)?.artwork).toBe(track.artwork);
    expect(mergeNowPlaying(track, beat)?.positionMs).toBe(87_000);
  });

  it("не переносит обложку на другой трек", () => {
    const next: MusicNowPlaying = { ...track, title: "Другой трек", artwork: null };

    expect(mergeNowPlaying(track, next)?.artwork).toBeNull();
  });

  it("заменяет обложку, если пришла новая", () => {
    const next: MusicNowPlaying = { ...track, artwork: "data:image/png;base64,BBBB" };

    expect(mergeNowPlaying(track, next)?.artwork).toBe("data:image/png;base64,BBBB");
  });

  it("не считает треком то же название у другого исполнителя", () => {
    const next: MusicNowPlaying = { ...track, artist: "Кто-то другой", artwork: null };

    expect(mergeNowPlaying(track, next)?.artwork).toBeNull();
  });
});
