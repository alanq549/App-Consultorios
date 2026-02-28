// src/modules/config/config.service.ts
import prisma from "@/core/prisma";
import { UpdateConfigInput } from "./config.dto";

export class ConfigService {
 static async getByUser(userId: number) {
  const config = await prisma.customConfig.findUnique({
    where: { userId },
    // filtramos y devolvemos solo los campos necesarios
    select: {
      id: true,
      userId: true,
      language: true,
      theme: true,
      layout: true,
      preferences: true,
      notificationsEnabled: true,
      //  createdAt y updatedAt  no se incluyen
    },
  });

  
  // si no se encuentra la configuracion, lanzamos un error
  if (!config) {
    throw new Error("Configuración no encontrada");
  }

  // devolvemos la configuracion encontrda
  return config;
}

// actualizacion de la configuracion del usuario
  static async update(userId: number, data: UpdateConfigInput) {
    const config = await prisma.customConfig.update({
      where: { userId },
      data,
    });

    return config;
  }
}
