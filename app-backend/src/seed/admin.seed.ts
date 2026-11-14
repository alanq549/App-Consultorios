// src/seed/admin.seed.ts
import prisma from "../shared/database/prisma";
import bcrypt from "bcrypt";
import { DEFAULT_AVATAR } from "@/core/config/media";

export async function seedAdmin() {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "[SEED] ERROR: Faltan DEFAULT_ADMIN_EMAIL o DEFAULT_ADMIN_PASSWORD en el entorno. El seed administrativo no puede ejecutarse con valores predecibles."
    );
  }

  const adminExists = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (adminExists) {
    console.log("[SEED] Admin ya existe ⚠️");
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

 await prisma.user.upsert({
  where: { email: adminEmail },
  update: {}, // si existe, no hagas nada
  create: {
    email: adminEmail,
    password: hashedPassword,
    role: "ADMIN",
    isVerified: true,

    adminProfile: {
      create: {
        name: "Admin",
        lastName: "Principal",
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
});


  console.log("[SEED] Admin creado con perfil y config ✅");
}
