//src/modules/users/users.routes.ts
import { Router } from "express";
import { UsersController } from "./users.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { createUploader } from "@/core/storage/upload";

const uploadAvatar = createUploader("img/avatars");


const router = Router();

router.get("/me", authMiddleware, UsersController.me);
router.patch("/profile", authMiddleware, UsersController.updateProfile);
router.patch("/email", authMiddleware, UsersController.changeEmail);
router.patch("/password", authMiddleware, UsersController.changePassword);

// Aquí reemplazas tu patch de avatar por multer
router.patch("/avatar",authMiddleware,uploadAvatar.single("avatar"), UsersController.updateAvatar,);

export default router;
