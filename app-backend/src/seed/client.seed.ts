// src/seed/client.seed.ts
import prisma from "../core/prisma";
import { AppointmentStatus, PaymentStatus } from "@prisma/client"; // enums
import bcrypt from "bcrypt";
import { DEFAULT_AVATAR } from "@/core/config/media";

type SeedAppointment = {
  serviceName: string;
  professionalEmail: string;
  date: Date;
  startMin: number;
  endMin: number;
  status: AppointmentStatus;
  payment: PaymentStatus;
  notes?: string;
  review?: { rating: number; comment: string };
};

type SeedClient = {
  email: string;
  password: string;
  name: string;
  lastName: string;
  phone: string;
  appointments: SeedAppointment[];
};

export async function seedClients() {
  const clients: SeedClient[] = [
    {
      email: "maria.cliente@test.com",
      password: "Cliente123",
      name: "Maria",
      lastName: "Lopez",
      phone: "555111222",
      appointments: [
        {
          serviceName: "Consulta Cardiológica",
          professionalEmail: "juan.cardiologo@test.com",
          date: new Date(Date.now() + 86400000),
          startMin: 600,
          endMin: 660,
          status: AppointmentStatus.CONFIRMED,
          payment: PaymentStatus.CONFIRMED,
          review: { rating: 5, comment: "Excelente atención!" },
        },
      ],
    },
    {
      email: "carlos.cliente@test.com",
      password: "Cliente123",
      name: "Carlos",
      lastName: "Ramirez",
      phone: "555333444",
      appointments: [
        {
          serviceName: "Consulta Pediátrica",
          professionalEmail: "ana.pediatra@test.com",
          date: new Date(Date.now() + 172800000),
          startMin: 540,
          endMin: 585,
          status: AppointmentStatus.PENDING,
          payment: PaymentStatus.PENDING,
        },
      ],
    },
  ];

  for (const client of clients) {
    try {
      const existingUser = await prisma.user.findUnique({ where: { email: client.email } });
      if (existingUser) {
        console.log(`[SEED] Cliente ya existe: ${client.email} ⚠️`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(client.password, 10);

      // Crear usuario y profile del cliente
      const user = await prisma.user.create({
        data: {
          email: client.email,
          password: hashedPassword,
          role: "CLIENT",
          isVerified: true,
          clientProfile: {
            create: {
              name: client.name,
              lastName: client.lastName,
              phone: client.phone,
              avatar: DEFAULT_AVATAR,
            },
          },
          customConfig: {
            create: {
              theme: "LIGHT",
              language: "ES",
              layout: "SIDEBAR",
              notificationsEnabled: true,
            },
          },
        },
        include: { clientProfile: true }, // 🔹 Importante para usar clientProfile!.id
      });

      // Crear citas y reviews
      for (const app of client.appointments) {
        const professional = await prisma.professionalProfile.findFirst({
          where: { user: { email: app.professionalEmail } },
        });

        if (!professional) {
          console.log(`[SEED] Profesional no encontrado: ${app.professionalEmail}`);
          continue;
        }

        const service = await prisma.service.findFirst({
          where: { name: app.serviceName, profileId: professional.id },
        });

        if (!service) {
          console.log(`[SEED] Servicio no encontrado: ${app.serviceName}`);
          continue;
        }

        if (!user.clientProfile) {
  console.log(`[SEED] Error: clientProfile no creado para ${client.email}`);
  continue;
}
        const appointment = await prisma.appointment.create({
          data: {
            clientProfileId: user.clientProfile.id,
            professionalProfileId: professional.id,
            serviceId: service.id,
            date: app.date,
            startMin: app.startMin,
            endMin: app.endMin,
            status: app.status,
            payment: app.payment,
            notes: app.notes ?? null,
          },
        });

        if (app.review) {
          await prisma.review.create({
            data: {
              appointmentId: appointment.id,
              rating: app.review.rating,
              comment: app.review.comment,
            },
          });
        }

        // Crear notificación de cita
        await prisma.notification.create({
          data: {
            userId: user.id,
            appointmentId: appointment.id,
            title: `Nueva cita ${app.status}`,
            message: `Tienes una cita con ${professional.name} ${professional.lastName} el ${appointment.date.toLocaleString()}`,
          },
        });
      }

      console.log(`[SEED] Cliente creado con citas y config: ${client.email} ✅`);
    } catch (error) {
      console.error(`[SEED] Error creando cliente ${client.email}:`, error);
    }
  }
}