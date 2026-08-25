import { z, type ZodType } from "zod";
import type { Request, Response, NextFunction } from "express";
import { ValidationError } from "../errors/app-error";

export const validate =
  (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      params: req.params,
      query: req.query,
      body: req.body,
    });

    if (!result.success) {
      const { fieldErrors, formErrors } = z.flattenError(result.error);
      throw new ValidationError(
        formErrors[0] ?? "Validation failed",
        fieldErrors as Record<string, string[]>,
      );
    }

    next();
  };
