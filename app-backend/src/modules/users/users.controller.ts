import { Request, Response } from "express";
import { UsersService } from "./users.service";

export class UsersController {
  static async me(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const data = await UsersService.me(req.user.id, req.user.role);
    res.json(data);
  }
}
