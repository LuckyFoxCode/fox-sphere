import { describe, expect, it } from "vitest";
import { parseItemArgs } from "../item-args";

describe("parseItemArgs", () => {
  it("splits category and term", () => {
    expect(parseItemArgs(["hero", "thug"])).toEqual({ category: "hero", term: "thug" });
  });

  it("lowercases both halves", () => {
    expect(parseItemArgs(["HERO", "THUG"])).toEqual({ category: "hero", term: "thug" });
  });

  it("keeps a multi-word term joined", () => {
    expect(parseItemArgs(["hero", "Big", "Robber"])).toEqual({
      category: "hero",
      term: "big robber",
    });
  });

  it("returns null without a term", () => {
    expect(parseItemArgs(["hero"])).toBeNull();
  });

  it("returns null without arguments", () => {
    expect(parseItemArgs([])).toBeNull();
  });
});
