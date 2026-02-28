// src/modules/appointments/appointments.controller.ts
import { Request, Response, NextFunction } from "express";
import { AppointmentService } from "./appointments.service";
import {
  CreateAppointmentSchema,
  CreateGuestAppointmentSchema,
  UpdateAppointmentStatusSchema,
} from "./appointments.dto";
import prisma from "@/core/prisma";

export class AppointmentsController {
  // crear una cita
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      // 1️⃣ Obtener el profile real del usuario
      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: req.user!.id },
      });

      if (!clientProfile) {
        throw new Error("Perfil de cliente no existe");
      }

      const clientProfileId = clientProfile.id;

      // 2️⃣ Validar + tipar con Zod
      const data = CreateAppointmentSchema.parse(req.body);

      // 3️⃣ Crear la cita
      const appointment = await AppointmentService.create(
        clientProfileId,
        data,
      );

      res.status(201).json(appointment);
    } catch (err) {
      next(err);
    }
  }

  //crear cita para guests (cliente no registrado/ocasional)
  static async createGuest(req: Request, res: Response, next: NextFunction) {
    try {
      // Validar la data con Zod (schema para guests)
      const guestData = CreateGuestAppointmentSchema.parse(req.body);

      // 1️⃣ Obtener el professionalProfileId desde la data validada
      const professionalProfileId = guestData.professionalProfileId;

      // 2️⃣ Crear la cita
      const appointment = await AppointmentService.createGuest(
        professionalProfileId,
        guestData,
      );

      res.status(201).json(appointment);
    } catch (err) {
      next(err);
    }
  }

  // actualizar estado de cita (confirmar o cancelar) solo el profesional puede hacer esto
  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      // 1️⃣ Validar autenticación
      if (!req.user) {
        throw new Error("No autenticado");
      }

      // 2️⃣ Obtener appointmentId desde params
      const appointmentId = Number(req.params.id);

      if (isNaN(appointmentId)) {
        throw new Error("ID de cita inválido");
      }

      // 3️⃣ Validar body
      const { status } = UpdateAppointmentStatusSchema.parse(req.body);

      // 4️⃣ Llamar al service
      const updated = await AppointmentService.updateStatusByProfessional(
        req.user.id,
        appointmentId,
        status,
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  // Historial de todas las citas del usuario
  static async history(req: Request, res: Response, next: NextFunction) {
    try {
      const appointments = await AppointmentService.getAppointmentsByUser(
        req.user!.id,
      );
      res.json(appointments);
    } catch (err) {
      next(err);
    }
  }

  // Próximas citas del usuario
  static async upcoming(req: Request, res: Response, next: NextFunction) {
    try {
      const appointments =
        await AppointmentService.getUpcomingAppointmentsByUser(req.user!.id);
      res.json(appointments);
    } catch (err) {
      next(err);
    }
  }
  // GET /api/appointments/availability?professionalId=1&serviceId=2&date=2026-01-14
  static async availability(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalProfileId = Number(req.query.professionalId);
      const serviceId = Number(req.query.serviceId);
      const dateStr = req.query.date as string;

      if (!professionalProfileId || !serviceId || !dateStr) {
        return res.status(400).json({ message: "Faltan parámetros" });
      }

      // Fecha LOCAL del negocio
      const date = new Date(`${dateStr}T00:00:00`);

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(24, 0, 0, 0);

      const slots = await AppointmentService.getAvailability(
        professionalProfileId,
        serviceId,
        startOfDay,
        endOfDay,
      );

      res.json(slots);
    } catch (err) {
      next(err);
    }
  }
}
