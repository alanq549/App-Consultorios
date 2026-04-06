// src/modules/specialty/specialty.routes.ts
import { Router } from "express";
import { SpecialtyController} from "./specialty.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { requireRole } from "@/middlewares/role.middleware";

const router = Router();

router.get("/", SpecialtyController.list);

router.get("/professional/:profileId", SpecialtyController.listByProfessional);

router.post(
  "/",
  authMiddleware,
  requireRole("ADMIN"),
  SpecialtyController.create
);

router.patch(
  "/:id",
  authMiddleware,
  requireRole("ADMIN"),
  SpecialtyController.update
);

router.delete(
  "/:id",
  authMiddleware,
  requireRole("ADMIN"),
  SpecialtyController.remove
);

export default router;