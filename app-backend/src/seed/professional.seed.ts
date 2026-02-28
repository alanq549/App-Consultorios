// src/seed/professional.seed.ts
import prisma from "../core/prisma";
import bcrypt from "bcrypt";
import { DEFAULT_AVATAR } from "@/core/config/media";

export async function seedProfessionals() {
  const cardiologia = await prisma.specialty.findUnique({
    where: { name: "Cardiología" },
  });

  const pediatria = await prisma.specialty.findUnique({
    where: { name: "Pediatría" },
  });

  if (!cardiologia || !pediatria) {
    console.error(
      "[SEED] Las especialidades necesarias no existen. Crea primero specialties.",
    );
    return;
  }

  const professionals = [
    {
      email: "juan.cardiologo@test.com",
      password: "Profesional123",
      name: "Juan",
      lastName: "Perez",
      phone: "555123456",
      specialtyId: cardiologia.id,
      description: "Especialista en cardiología con 10 años de experiencia",
      services: [
        {
          name: "Consulta Cardiológica",
          description: "Evaluación completa del corazón",
          durationMin: 60,
          price: 80,
        },
        {
          name: "Electrocardiograma",
          description: "Prueba de ECG rápida",
          durationMin: 30,
          price: 40,
        },
      ],
    },
    {
      email: "ana.pediatra@test.com",
      password: "Profesional123",
      name: "Ana",
      lastName: "Gomez",
      phone: "555987654",
      specialtyId: pediatria.id,
      description: "Pediatra dedicada al cuidado infantil",
      services: [
        {
          name: "Consulta Pediátrica",
          description: "Revisión general del niño",
          durationMin: 45,
          price: 50,
        },
      ],
    },
  ];

  for (const prof of professionals) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: prof.email },
        include: {
          professionalProfile: {
            include: {
              services: true,
              specialties: true,
            },
          },
        },
      });

      const hashedPassword = await bcrypt.hash(prof.password, 10);

      // ======================================================
      // 🔹 CREAR PROFESIONAL SI NO EXISTE
      // ======================================================
      if (!existingUser) {
        await prisma.user.create({
          data: {
            email: prof.email,
            password: hashedPassword,
            role: "PROFESSIONAL",
            isVerified: true,
            professionalProfile: {
              create: {
                name: prof.name,
                lastName: prof.lastName,
                phone: prof.phone,
                avatar: DEFAULT_AVATAR,
                description: prof.description,
                verificationStatus: "APPROVED",

                specialties: {
                  create: {
                    specialtyId: prof.specialtyId,
                    status: "APPROVED",
                  },
                },

                services: {
                  create: prof.services.map((s) => ({
                    ...s,
                    specialtyId: prof.specialtyId,
                  })),
                },
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
        });

        console.log(`[SEED] Profesional creado: ${prof.email} ✅`);
        continue;
      }

      // ======================================================
      // 🔹 SI YA EXISTE → TRABAJAR SOBRE PROFILE
      // ======================================================
      const profile = existingUser.professionalProfile;

      if (!profile) {
        console.log(`[SEED] Usuario sin perfil profesional: ${prof.email}`);
        continue;
      }

      // 1️⃣ Asegurar que tenga la especialidad
      const existingRelation = profile.specialties.find(
        (s) => s.specialtyId === prof.specialtyId,
      );

      if (!existingRelation) {
        await prisma.professionalSpecialty.create({
          data: {
            professionalId: profile.id,
            specialtyId: prof.specialtyId,
            status: "APPROVED",
          },
        });

        console.log(
          `[SEED] Especialidad agregada al profesional: ${prof.email}`,
        );
      }

      // 2️⃣ Asegurar que la especialidad esté APPROVED
      if (
        existingRelation &&
        existingRelation.status !== "APPROVED"
      ) {
        await prisma.professionalSpecialty.update({
          where: {
            professionalId_specialtyId: {
              professionalId: profile.id,
              specialtyId: prof.specialtyId,
            },
          },
          data: { status: "APPROVED" },
        });

        console.log(
          `[SEED] Especialidad aprobada para profesional: ${prof.email}`,
        );
      }

      // 3️⃣ Agregar servicios faltantes
      const existingServiceNames = profile.services.map((s) => s.name);

      const servicesToCreate = prof.services.filter(
        (s) => !existingServiceNames.includes(s.name),
      );

      if (servicesToCreate.length > 0) {
        await prisma.service.createMany({
          data: servicesToCreate.map((s) => ({
            ...s,
            profileId: profile.id,
            specialtyId: prof.specialtyId,
            isActive: true,
          })),
        });

        console.log(
          `[SEED] Servicios agregados a profesional existente: ${prof.email} ✅`,
        );
      } else {
        console.log(
          `[SEED] Profesional ya tiene todos los servicios: ${prof.email} ⚠️`,
        );
      }
    } catch (error) {
      console.error(
        `[SEED] Error creando/actualizando profesional ${prof.email}:`,
        error,
      );
    }
  }
}