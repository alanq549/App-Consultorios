"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsController = void 0;
const reviews_service_1 = require("./reviews.service");
const reviews_dto_1 = require("./reviews.dto");
class ReviewsController {
    // crear review
    static async create(req, res, next) {
        try {
            const userId = req.user.id;
            const data = reviews_dto_1.CreateReviewDTO.parse(req.body);
            const review = await reviews_service_1.ReviewsService.create(userId, data);
            res.status(201).json(review);
        }
        catch (err) {
            next(err);
        }
    }
    // reviews de un profesional
    static async getProfessionalReviews(req, res, next) {
        try {
            const professionalProfileId = Number(req.params.professionalProfileId);
            if (Number.isNaN(professionalProfileId)) {
                return res
                    .status(400)
                    .json({ message: "Invalid professional profile id" });
            }
            const reviews = await reviews_service_1.ReviewsService.getProfessionalReviews(professionalProfileId);
            res.json(reviews);
        }
        catch (err) {
            next(err);
        }
    }
    static async getByAppointments(req, res, next) {
        try {
            const { appointmentIds } = req.body;
            const reviews = await reviews_service_1.ReviewsService.getByAppointments(appointmentIds);
            res.json(reviews);
        }
        catch (err) {
            next(err);
        }
    }
    // review de una cita
    static async getByAppointment(req, res, next) {
        try {
            const appointmentId = Number(req.params.appointmentId);
            if (Number.isNaN(appointmentId)) {
                return res.status(400).json({ message: "Invalid appointment id" });
            }
            const review = await reviews_service_1.ReviewsService.getByAppointment(appointmentId);
            res.json(review);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ReviewsController = ReviewsController;
