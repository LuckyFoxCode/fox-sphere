import { z, type ZodType } from "zod";
import type { Request, Response, NextFunction } from "express";
import { ValidationError } from "@fox-sphere/backend-shared";

type RequestLocation = "params" | "query" | "body";

// Express 5 makes req.query a getter, so a parsed query cannot be written back in
// place. It goes here instead; read it with validatedQuery() below.
type WithValidatedQuery = Request & { validatedQuery?: unknown };

/**
 * The parsed query for a route whose `request.query` schema produced it. Typed by
 * the caller because only the route knows its own schema:
 *
 *   const { page } = validatedQuery<ListUsersQuery>(req);
 */
export const validatedQuery = <T>(req: Request): T =>
  (req as WithValidatedQuery).validatedQuery as T;

export const validate =
  (schema: ZodType, location: RequestLocation) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[location]);

    if (!result.success) {
      const { fieldErrors, formErrors } = z.flattenError(result.error);

      const errors: Record<string, string[]> = {};
      for (const [field, messages] of Object.entries(fieldErrors)) {
        if (Array.isArray(messages)) errors[field] = messages.map(String);
      }

      const detail = Object.entries(errors)
        .map(([field, messages]) => `${field}: ${messages[0]}`)
        .join("; ");

      const message =
        formErrors[0] ?? (detail === "" ? "Validation failed" : detail);

      throw new ValidationError(message, errors);
    }

    // Keep the PARSED value, not the raw one - otherwise coercion, defaults and
    // unknown-key stripping are computed and then thrown away, and the handler
    // silently sees data the schema says is impossible.
    if (location === "query") {
      (req as WithValidatedQuery).validatedQuery = result.data;
    } else {
      req[location] = result.data as never;
    }

    next();
  };
