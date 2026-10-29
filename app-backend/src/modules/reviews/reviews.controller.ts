import { Request, Response, NextFunction } from "express";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDTO, GetReviewsByAppointmentsDTO } from "./reviews.dto";

export class ReviewsController {
  // crear review
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      const data = CreateReviewDTO.parse(req.body);

      const review = await ReviewsService.create(userId, data);

      res.status(201).json(review);
    } catch (err) {
      next(err);
    }
  }

  // reviews de un profesional
  static async getProfessionalReviews(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const professionalProfileId = Number(req.params.professionalProfileId);

      if (Number.isNaN(professionalProfileId)) {
        return res
          .status(400)
          .json({ message: "Invalid professional profile id" });
      }

      const tenantId = res.locals.tenantId as number;

      const reviews = await ReviewsService.getProfessionalReviews(
        professionalProfileId,
        tenantId,
      );

      // El profesional no pertenece al tenant seleccionado: respuesta uniforme de no encontrado.
      if (reviews === null) {
        return res.status(404).json({
          message: "Perfil profesional no encontrado",
        });
      }

      return res.json(reviews);
    } catch (err) {
      next(err);
    }
  }

  static async getByAppointments(req: Request, res: Response, next: NextFunction) {
  try {
    // Sólo se devuelven las reseñas de citas en las que el usuario autenticado participa.
    const { appointmentIds } = GetReviewsByAppointmentsDTO.parse(req.body);

    const reviews = await ReviewsService.getByAppointments(
      appointmentIds,
      req.user!.id,
    );

    res.json(reviews);
  } catch (err) {
    next(err);
  }
}

  // review de una cita
  static async getByAppointment(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const appointmentId = Number(req.params.appointmentId);

      if (Number.isNaN(appointmentId)) {
        return res.status(400).json({ message: "Invalid appointment id" });
      }
      const review = await ReviewsService.getByAppointment(
        appointmentId,
        req.user!.id,
      );

      // Sin participación en la cita: respuesta uniforme de no encontrado.
      if (review === null) {
        return res.status(404).json({ message: "Reseña no encontrada" });
      }

      return res.json(review);
    } catch (err) {
      next(err);
    }
  }
}
