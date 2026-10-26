import { describe, expect, it } from "vitest";
import { findHeroByTerm } from "@fox-sphere/types";

describe("findHeroByTerm", () => {
  it("resolves by id, ignoring case", () => {
    expect(findHeroByTerm("THUG")?.id).toBe("thug");
  });

  it("resolves by display name, ignoring case", () => {
    expect(findHeroByTerm("robber")?.id).toBe("robber");
  });

  it("returns undefined for a typo instead of the default hero", () => {
    expect(findHeroByTerm("tugg")).toBeUndefined();
  });
});
