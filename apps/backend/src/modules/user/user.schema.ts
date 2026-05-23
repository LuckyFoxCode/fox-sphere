import { CreateUserSchema } from "@fox-sphere/shared-schemas";
import { NextFunction, Request, Response } from "express";

export const validateCreateUser = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const result = CreateUserSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Failed to create user",
      error: "Validation Error",
      details: result.error,
    });
  }

  req.body = result.data;
  return next();
};
