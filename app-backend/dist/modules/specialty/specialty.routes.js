"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/specialty/specialty.routes.ts
const express_1 = require("express");
const specialty_controller_1 = require("./specialty.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.get("/", specialty_controller_1.SpecialtyController.list);
router.get("/professional/:profileId", specialty_controller_1.SpecialtyController.listByProfessional);
router.get("/soft-deleted", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("ADMIN"), specialty_controller_1.SpecialtyController.list_soft_delete);
router.post("/", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("ADMIN"), specialty_controller_1.SpecialtyController.create);
router.patch("/:id", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("ADMIN"), specialty_controller_1.SpecialtyController.update);
router.patch("/:id/restore", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("ADMIN"), specialty_controller_1.SpecialtyController.restore);
router.delete("/:id", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("ADMIN"), specialty_controller_1.SpecialtyController.remove);
exports.default = router;
