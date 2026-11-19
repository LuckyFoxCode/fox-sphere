import { Logger } from "@fox-sphere/backend-shared";
import { MusicStateRequestSchema } from "@fox-sphere/shared-schemas";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@fox-sphere/types";
import express, { type Express, type RequestHandler } from "express";
import type { Server } from "socket.io";
import { verifyMusicToken } from "./music.auth";
import { setNowPlaying } from "./music.state";

/**
 * Приём состояния от агента на Windows.
 *
 * Токен читается из `process.env`, а не из `config`/`getEnv`, по той же причине,
 * что и админские переменные: `config` бросает на отсутствующей переменной, и
 * бот перестал бы стартовать там, где агент музыки вообще не настроен. Здесь
 * отсутствие токена — отказ в обслуживании одного роута, а не падение процесса.
 *
 * Роут не лежит под `/api/internal/*`: у него собственный trust model —
 * единственный вызывающий, аутентифицированный bearer-токеном.
 */
export const registerMusicRoutes = (
  app: Express,
  io: Server<ClientToServerEvents, ServerToClientEvents>,
): void => {
  let hasWarnedAboutMissingToken = false;

  // Токен проверяется отдельным middleware и ДО разбора тела: иначе запрос без
  // токена всё равно заставлял бы сервер прочитать и распарсить до мегабайта, и
  // это был бы бесплатный способ занять процесс снаружи. Отказ обязан стоить
  // одно сравнение строк.
  const requireAgentToken: RequestHandler = (req, res, next) => {
    const verdict = verifyMusicToken(
      req.headers.authorization,
      process.env.MUSIC_AGENT_TOKEN,
    );

    if (verdict === "unconfigured") {
      // Предупреждение один раз за жизнь процесса: агент шлёт сердцебиение раз
      // в 15 секунд, и строка на каждый запрос утопила бы лог.
      if (!hasWarnedAboutMissingToken) {
        hasWarnedAboutMissingToken = true;
        Logger.warn(
          "Music",
          "MUSIC_AGENT_TOKEN is missing - POST /api/music/state answers 503",
        );
      }

      res.status(503).json({ error: "Music agent token is not configured" });
      return;
    }

    if (verdict === "denied") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    next();
  };

  // Свой json-парсер с лимитом под обложку: глобальный `express.json()` держит
  // 100 КБ, а data URL картинки доходит до ~270 КБ. Поэтому этот роут
  // регистрируется ДО `app.use(express.json())` - см. порядок в `app.ts`.
  app.post(
    "/api/music/state",
    requireAgentToken,
    express.json({ limit: "1mb" }),
    (req, res) => {
      const parsed = MusicStateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "Invalid payload", issues: parsed.error.issues });
      }

      const state = setNowPlaying(parsed.data.state);
      // Глобальный emit, добавленный осознанно: комнат каналов ещё нет
      // (phase 1 multi-tenant), а канал один. Phase 1 должна найти это место.
      io.emit("music:now-playing", state);

      return res.status(204).end();
    },
  );
};
