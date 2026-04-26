import { Request, Response, NextFunction } from "express";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDTO } from "./reviews.dto";

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

      const reviews = await ReviewsService.getProfessionalReviews(
        professionalProfileId,
      );

      res.json(reviews);
    } catch (err) {
      next(err);
    }
  }

  static async getByAppointments(req: Request, res: Response, next: NextFunction) {
  try {
    const { appointmentIds } = req.body;

    const reviews = await ReviewsService.getByAppointments(appointmentIds);

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
      const review = await ReviewsService.getByAppointment(appointmentId);

      res.json(review);
    } catch (err) {
      next(err);
    }
  }
}
