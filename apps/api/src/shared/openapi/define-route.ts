import { ErrorResponseSchema } from "@fox-sphere/shared-schemas";
import { Router, type RequestHandler } from "express";
import type { ZodObject, ZodType } from "zod";
import { validate } from "../middleware";
import { registry } from "./registry";

// Every module router is mounted under this prefix in app.ts, so the OpenAPI
// path has to carry it - the path passed to route() is relative to the mount.
const API_PREFIX = "/api";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

type RouteRequest = {
  params?: ZodObject;
  query?: ZodObject;
  body?: ZodType;
};

type RouteResponse = {
  description: string;
  // Omit for a body-less answer (204). Any other status with no schema is
  // documented with ErrorResponseSchema for 4xx/5xx - see toOpenApiResponses.
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

// zod-to-openapi merges a second registration of the same method+path over the first
// without warning, while Express keeps serving the first handler - the spec would
// then describe a route the server does not run. Refuse at import time instead.
const registered = new Set<string>();

const toOpenApiPath = (path: string): string =>
  `${API_PREFIX}${path.replace(/:([A-Za-z0-9_]+)/g, "{$1}")}`;

const toOpenApiResponses = (responses: Record<number, RouteResponse>) =>
  Object.fromEntries(
    Object.entries(responses).map(([status, { description, schema }]) => {
      // An error status with no schema of its own still has a body - the one
      // errorHandler sends. Documenting it is what lets a client tell a failure
      // apart from an empty success.
      const resolved =
        schema ?? (Number(status) >= 400 ? ErrorResponseSchema : undefined);

      return [
        status,
        resolved
          ? { description, content: { "application/json": { schema: resolved } } }
          : { description },
      ];
    }),
  );

/**
 * One module = one tag = one router. `route()` registers the OpenAPI path and
 * mounts the Express handler from the same object, so a path cannot be
 * registered without a handler, or a handler mounted without a path.
 *
 * The committed spec still drifts if you skip `pnpm openapi:dump`, and a new
 * module must be added to `src/modules/index.ts` or it reaches neither the app
 * nor the spec.
 *
 *   const { router, route } = createModule("Users");
 *   route({ method: "get", path: "/users/:id", ... }, handler);
 *   export { router as userRouter };
 */
export const createModule = (tag: string) => {
  const router: Router = Router();

  const route = (spec: RouteSpec, ...handlers: RequestHandler[]): void => {
    const openApiPath = toOpenApiPath(spec.path);
    const key = `${spec.method} ${openApiPath}`;

    if (registered.has(key)) {
      throw new Error(
        `Duplicate route ${key} - one route() call per method and path.`,
      );
    }
    registered.add(key);

    if (handlers.length === 0) {
      throw new Error(`Route ${key} has no handler - the request would hang.`);
    }

    registry.registerPath({
      method: spec.method,
      path: openApiPath,
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
