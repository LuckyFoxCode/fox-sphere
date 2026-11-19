import { timingSafeEqual } from "node:crypto";

export type MusicTokenVerdict = "ok" | "unconfigured" | "denied";

const BEARER_PREFIX = "bearer ";

/**
 * Проверяет `Authorization` агента музыки.
 *
 * `unconfigured` и `denied` разделены намеренно: без переменной окружения роут
 * обязан отвечать 503 и писать предупреждение, а не притворяться, что пароль
 * неверный - иначе выкатка без токена выглядит как «агент сломался».
 */
export const verifyMusicToken = (
  header: string | undefined,
  expected: string | undefined,
): MusicTokenVerdict => {
  if (!expected) return "unconfigured";
  if (!header) return "denied";

  const hasBearer = header.toLowerCase().startsWith(BEARER_PREFIX);
  const value = hasBearer ? header.slice(BEARER_PREFIX.length).trim() : "";
  if (!value) return "denied";

  const given = Buffer.from(value);
  const wanted = Buffer.from(expected);

  // `timingSafeEqual` бросает на буферах разной длины, поэтому длина сверяется
  // отдельно и до вызова. Утечка длины токена здесь несущественна: сравнение
  // всё равно идёт по равным длинам.
  if (given.length !== wanted.length) return "denied";

  return timingSafeEqual(given, wanted) ? "ok" : "denied";
};
