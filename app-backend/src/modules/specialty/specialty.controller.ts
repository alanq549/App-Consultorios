import { Request, Response } from "express";
import { CreateSpecialtySchema, UpdateSpecialtySchema } from "./specialty.dto";
import { SpecialtyService } from "./specialty.service";

export class SpecialtyController {

  static async create(req: Request, res: Response) {

    const data = CreateSpecialtySchema.parse(req.body);

    const specialty = await SpecialtyService.create(data);

    res.status(201).json(specialty);

  }

  static async list(req: Request, res: Response) {

    const specialties = await SpecialtyService.list();

    res.json(specialties);
  }
  static async listByProfessional(req: Request, res: Response){
    const profileId = Number(req.params.profileId)
    const specialties = await SpecialtyService.listByProfessional(profileId);  
    res.json(specialties);
    
  }

  static async update(req: Request, res: Response) {

    const id = Number(req.params.id);
    const data = UpdateSpecialtySchema.parse(req.body);

    const specialty = await SpecialtyService.update(id, data);

    res.json(specialty);

  }

  static async remove(req: Request, res: Response) {

    const id = Number(req.params.id);

    await SpecialtyService.remove(id);

    res.status(204).send();

  }

}