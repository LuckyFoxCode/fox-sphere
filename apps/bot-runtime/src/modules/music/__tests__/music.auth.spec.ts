import { describe, expect, it } from "vitest";
import { verifyMusicToken } from "../music.auth";

describe("verifyMusicToken", () => {
  it("отвечает unconfigured, когда переменная не задана", () => {
    expect(verifyMusicToken("Bearer abc", undefined)).toBe("unconfigured");
  });

  it("отвечает unconfigured на пустую строку в переменной", () => {
    expect(verifyMusicToken("Bearer abc", "")).toBe("unconfigured");
  });

  it("отвечает denied без заголовка", () => {
    expect(verifyMusicToken(undefined, "abc")).toBe("denied");
  });

  it("отвечает denied на чужой токен той же длины", () => {
    expect(verifyMusicToken("Bearer abd", "abc")).toBe("denied");
  });

  it("отвечает denied на токен другой длины, не бросая исключение", () => {
    expect(verifyMusicToken("Bearer ab", "abc")).toBe("denied");
  });

  it("отвечает denied на заголовок без префикса Bearer", () => {
    expect(verifyMusicToken("abc", "abc")).toBe("denied");
  });

  it("отвечает ok на верный токен", () => {
    expect(verifyMusicToken("Bearer abc", "abc")).toBe("ok");
  });

  it("не различает регистр в слове Bearer", () => {
    expect(verifyMusicToken("bearer abc", "abc")).toBe("ok");
  });
});
