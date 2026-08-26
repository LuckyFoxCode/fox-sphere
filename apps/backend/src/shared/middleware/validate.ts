import { z, type ZodType } from "zod";
import type { Request, Response, NextFunction } from "express";
import { ValidationError } from "../errors/app-error";

type RequestLocation = "params" | "query" | "body";

export const validate =
  (schema: ZodType, location: RequestLocation = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[location]);

    if (!result.success) {
      const { fieldErrors, formErrors } = z.flattenError(result.error);
      throw new ValidationError(
        formErrors[0] ?? "Validation failed",
        fieldErrors as Record<string, string[]>,
      );
    }

    next();
  };
