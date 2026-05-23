import { ErrorRequestHandler } from "express";
import { AppError, ValidationError } from "../errors/app-error.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
      ...(err instanceof ValidationError && { errors: err.errors }),
    });
  }

  console.error("💥 System error:", err);

  const isProd = process.env.NODE_ENV === "production";
  return res.status(500).json({
    status: "error",
    message: isProd ? "Internal server error" : err.message,
  });
};
