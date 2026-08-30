import { Router } from "express";

import "./hello.openapi";

const router: Router = Router();

router.get("/hello", (_req, res) => {
  res.json({ message: "Hello, World!" });
});

export { router as helloRouter };