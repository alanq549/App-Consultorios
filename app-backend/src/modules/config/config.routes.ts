// src/modules/config/config.routes.ts
import { Router } from "express";
import { ConfigController } from "./config.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";

const router = Router();

router.get("/me", authMiddleware, ConfigController.me);
router.put("/me", authMiddleware, ConfigController.update);

export default router;
