// registry is deliberately NOT exported: route() in define-route.ts is the only
// thing that may register a path, so a path cannot exist without a handler.
// generator.ts imports ./registry directly.
export { generateOpenAPISpec } from "./generator";
export { createModule } from "./define-route";
export type { HttpMethod, RouteSpec } from "./define-route";
