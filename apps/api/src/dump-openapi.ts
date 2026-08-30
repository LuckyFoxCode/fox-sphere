// Writes the generated spec to apps/api/openapi.json. That file is committed and
// is what the admin client generator (orval) reads - so `pnpm build:a` and CI
// never need a running server. Re-run after adding or changing a route.
import { writeFileSync } from "fs";
import { resolve } from "path";
import { Logger } from "@fox-sphere/backend-shared";
import { generateOpenAPISpec } from "./shared/openapi";

// Importing the module list registers every route's OpenAPI path as a side effect.
// It is the same list app.ts mounts, so the spec cannot miss a mounted module.
import "./modules";

const target = resolve(process.cwd(), "openapi.json");

writeFileSync(target, `${JSON.stringify(generateOpenAPISpec(), null, 2)}\n`);

Logger.info("OpenAPI", `Spec written to ${target}`);
