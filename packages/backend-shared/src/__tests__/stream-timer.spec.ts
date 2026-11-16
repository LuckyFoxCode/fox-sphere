import { describe, expect, it } from "vitest";
import { resolveActiveTimer } from "../stream-timer";

const state = (
  overrides: Partial<{
    timerTitle: string | null;
    timerColor: string | null;
    timerEndsAt: Date | null;
  }> = {},
) => ({
  timerTitle: "BRB",
  timerColor: "red",
  timerEndsAt: new Date(Date.now() + 60_000),
  ...overrides,
});

describe("resolveActiveTimer", () => {
  it("returns null when no timer was ever set", () => {
    expect(
      resolveActiveTimer({
        timerTitle: null,
        timerColor: null,
        timerEndsAt: null,
      }),
    ).toBeNull();
  });

  it("returns null for a deadline with no title, even if it is still ahead", () => {
    expect(resolveActiveTimer(state({ timerTitle: null }))).toBeNull();
  });

  it("returns null for a title with no deadline", () => {
    expect(resolveActiveTimer(state({ timerEndsAt: null }))).toBeNull();
  });

  it("returns null once the timer has expired", () => {
    expect(
      resolveActiveTimer(state({ timerEndsAt: new Date(Date.now() - 1_000) })),
    ).toBeNull();
  });

  it("treats the exact expiry instant as expired, not active", () => {
    expect(resolveActiveTimer(state({ timerEndsAt: new Date() }))).toBeNull();
  });

  it("returns the title, colour and deadline while the timer is live", () => {
    const timerEndsAt = new Date(Date.now() + 60_000);

    expect(resolveActiveTimer(state({ timerEndsAt }))).toEqual({
      title: "BRB",
      color: "red",
      endsAt: timerEndsAt.getTime(),
    });
  });

  it("falls back to blue when the stored colour is not a widget variant", () => {
    expect(resolveActiveTimer(state({ timerColor: "crimson" }))?.color).toBe(
      "blue",
    );
  });

  it("falls back to blue when the colour was never stored", () => {
    expect(resolveActiveTimer(state({ timerColor: null }))?.color).toBe("blue");
  });

  it("reads the deadline off a supplied clock instead of the wall clock", () => {
    const timerEndsAt = new Date(2_000_000);

    expect(resolveActiveTimer(state({ timerEndsAt }), 1_000_000)).not.toBeNull();
    expect(resolveActiveTimer(state({ timerEndsAt }), 2_000_000)).toBeNull();
  });
});
