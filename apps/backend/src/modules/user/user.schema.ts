import { CreateUserSchema } from "@fox-sphere/shared-schemas";
import { NextFunction, Request, Response } from "express";
import { ValidationError } from "../../shared/errors/app-error";

export const validateCreateUser = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const result = CreateUserSchema.safeParse(req.body);

  if (!result.success) {
    const formattedErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const path = issue.path[0]?.toString();
      if (path) {
        if (!formattedErrors[path]) {
          formattedErrors[path] = [];
        }
        formattedErrors[path].push(issue.message);
      }
    }
    return next(new ValidationError("Failed to create user", formattedErrors));
  }

  req.body = result.data;
  return next();
};
