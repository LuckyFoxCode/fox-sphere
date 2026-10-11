import { SessionMeSchema } from "@fox-sphere/shared-schemas";
import { createModule } from "../../shared/openapi";
import { getCurrentSession } from "./auth.service";

const { router, route } = createModule("Auth");

route(
  {
    method: "get",
    path: "/auth/me",
    summary: "Get the currently signed-in admin",
    operationId: "getSessionMe",
    responses: {
      200: { description: "The signed-in admin", schema: SessionMeSchema },
      401: { description: "No valid session cookie" },
      500: { description: "Unexpected server error" },
    },
  },
  async (_req, res) => {
    res.json(getCurrentSession(res));
  },
);

export { router as authRouter };
