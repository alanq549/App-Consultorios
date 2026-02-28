import { Router } from "express";
import { UsersController } from "./users.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";

const router = Router();

router.get("/me", authMiddleware, UsersController.me);

export default router;
