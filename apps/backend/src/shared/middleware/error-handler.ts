import { ErrorRequestHandler } from "express";
import { AppError, ValidationError } from "../errors/app-error";
import { Logger } from "../services/logger.service";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    Logger.debug(
      "ExpressErrorHandler",
      `AppError [${err.statusCode}]: ${err.message}`,
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

  const isProd = process.env.NODE_ENV === "production";
  return res.status(500).json({
    status: "error",
    message: isProd ? "Internal server error" : err.message,
  });
};
