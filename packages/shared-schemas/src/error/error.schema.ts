import "../zod-extensions.js";
import { z } from "zod";

// The exact body `errorHandler` sends for every AppError and for an unhandled 500.
// Every non-2xx response in the spec points at this, so a generated client can see
// failures instead of typing them as `void`.
export const ErrorResponseSchema = z
  .object({
    status: z.literal("error"),
    message: z.string().openapi({ example: "Channel not found" }),
    errors: z
      .record(z.string(), z.array(z.string()))
      .optional()
      .openapi({ example: { id: ["Invalid input"] } }),
  })
  .openapi("ErrorResponse");

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
