// src/seed/admin.seed.ts
import prisma from "../core/prisma";
import bcrypt from "bcrypt";
import { DEFAULT_AVATAR } from "@/core/config/media";

export async function seedAdmin() {
  const adminEmail = "admin@test.com";

  const adminExists = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (adminExists) {
    console.log("[SEED] Admin ya existe ⚠️");// le puse aqui un 2 para diferenciar de otro mensaje similar, y resulto ser el mismo
    return;
  }

  const hashedPassword = await bcrypt.hash("Admin123", 10);

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
