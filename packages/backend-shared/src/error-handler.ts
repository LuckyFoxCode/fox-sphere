// The one error middleware for both backends. It lived twice, byte-identical, in
// apps/api and apps/bot-runtime - which is the shape every drift starts as.
import { ErrorRequestHandler } from "express";
import { AppError, ValidationError } from "./errors";
import { config } from "./config";
import { Logger } from "./logger";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    Logger.warn(
      "ExpressErrorHandler",
      `${req.method} ${req.originalUrl} -> ${err.statusCode}: ${err.message}`,
    );

    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
      ...(err instanceof ValidationError && { errors: err.errors }),
    });
  }

  Logger.error(
    "ExpressErrorHandler",
    "Unhandled system error encountered 💥",
    err,
  );

  const isProd = config.nodeEnv === "production";
  const message = err instanceof Error ? err.message : String(err);
  return res.status(500).json({
    status: "error",
    message: isProd ? "Internal server error" : message,
  });
};
