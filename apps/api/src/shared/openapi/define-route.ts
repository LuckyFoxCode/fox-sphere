import { Router, type RequestHandler } from "express";
import type { ZodObject, ZodType } from "zod";
import { validate } from "../middleware";
import { registry } from "./registry";

// Every module router is mounted under this prefix in app.ts, so the OpenAPI
// path has to carry it - Express never sees it, the spec always does.
const API_PREFIX = "/api";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

type RouteRequest = {
  params?: ZodObject;
  query?: ZodObject;
  body?: ZodType;
};

type RouteResponse = {
  description: string;
  schema?: ZodType;
};

type RouteSpec = {
  method: HttpMethod;
  // Express path, with `:param` placeholders - converted to `{param}` for OpenAPI.
  path: string;
  summary: string;
  description?: string;
  // Becomes the generated client's function/hook name. Set it, or orval invents one.
  operationId?: string;
  request?: RouteRequest;
  responses: Record<number, RouteResponse>;
};

const toOpenApiPath = (path: string): string =>
  `${API_PREFIX}${path.replace(/:([A-Za-z0-9_]+)/g, "{$1}")}`;

const toOpenApiResponses = (responses: Record<number, RouteResponse>) =>
  Object.fromEntries(
    Object.entries(responses).map(([status, { description, schema }]) => [
      status,
      schema
        ? { description, content: { "application/json": { schema } } }
        : { description },
    ]),
  );

/**
 * One module = one tag = one router. `route()` registers the OpenAPI path and
 * mounts the Express handler from the same object, so the spec cannot drift
 * from the implementation.
 *
 *   const { router, route } = createModule("Users");
 *   route({ method: "get", path: "/users/:id", ... }, handler);
 *   export { router as userRouter };
 */
export const createModule = (tag: string) => {
  const router: Router = Router();

  const route = (spec: RouteSpec, ...handlers: RequestHandler[]): void => {
    registry.registerPath({
      method: spec.method,
      path: toOpenApiPath(spec.path),
      tags: [tag],
      summary: spec.summary,
      ...(spec.description && { description: spec.description }),
      ...(spec.operationId && { operationId: spec.operationId }),
      request: {
        ...(spec.request?.params && { params: spec.request.params }),
        ...(spec.request?.query && { query: spec.request.query }),
        ...(spec.request?.body && {
          body: {
            content: { "application/json": { schema: spec.request.body } },
          },
        }),
      },
      responses: toOpenApiResponses(spec.responses),
    });

    const validators: RequestHandler[] = [];
    if (spec.request?.params) validators.push(validate(spec.request.params, "params"));
    if (spec.request?.query) validators.push(validate(spec.request.query, "query"));
    if (spec.request?.body) validators.push(validate(spec.request.body, "body"));

    router[spec.method](spec.path, ...validators, ...handlers);
  };

  return { router, route };
};

export type { HttpMethod, RouteSpec };
