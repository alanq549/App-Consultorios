import { NextFunction, Request, Response } from "express";
import { ConfigService } from "./config.service";
import { UpdateConfigDTO } from "./config.dto";

export class ConfigController {
  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const config = await ConfigService.getByUser(userId);
      res.json(config);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const data = UpdateConfigDTO.parse(req.body);
      const config = await ConfigService.update(userId, data);
      res.json(config);
    } catch (err) {
      next(err);
    }
  }
}
