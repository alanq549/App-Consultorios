"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//src/modules/users/users.routes.ts
const express_1 = require("express");
const users_controller_1 = require("./users.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const upload_1 = require("../../core/storage/upload");
const uploadAvatar = (0, upload_1.createUploader)("img/avatars");
const router = (0, express_1.Router)();
router.get("/me", auth_middleware_1.authMiddleware, users_controller_1.UsersController.me);
router.patch("/profile", auth_middleware_1.authMiddleware, users_controller_1.UsersController.updateProfile);
router.patch("/email", auth_middleware_1.authMiddleware, users_controller_1.UsersController.changeEmail);
router.patch("/password", auth_middleware_1.authMiddleware, users_controller_1.UsersController.changePassword);
// Aquí reemplazas tu patch de avatar por multer
router.patch("/avatar", auth_middleware_1.authMiddleware, uploadAvatar.single("avatar"), users_controller_1.UsersController.updateAvatar);
exports.default = router;
