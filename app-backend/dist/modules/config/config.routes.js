"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/config/config.routes.ts
const express_1 = require("express");
const config_controller_1 = require("./config.controller");
const auth_middleware_1 = require("@/middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get("/me", auth_middleware_1.authMiddleware, config_controller_1.ConfigController.me);
router.put("/me", auth_middleware_1.authMiddleware, config_controller_1.ConfigController.update);
exports.default = router;
