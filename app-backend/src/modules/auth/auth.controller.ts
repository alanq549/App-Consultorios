/// src/modules/auth/auth.controller.ts
import { NextFunction, Request, Response } from "express";
import { AuthService } from "./auth.service";
import {
  RegisterDTO,
  RegisterResponseDTO
} from "./auth.dto";


export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await RegisterDTO.parseAsync(req.body);
    const user = await AuthService.register(data);
    const response = RegisterResponseDTO.parse(user);

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

}
