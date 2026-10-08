/// src/modules/auth/auth.routes.ts
import { Router } from "express";
import { AuthController } from "./auth.controller";

const router = Router();

router.post("/register", AuthController.register);

export default router;
