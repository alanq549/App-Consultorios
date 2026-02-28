// src/seed/schedule.seed.ts
import prisma from "../core/prisma";

export async function seedSchedules() {
  const schedules = [
    { profileId: 1, dayOfWeek: 1, startMin: 540, endMin: 1020, isActive: true }, // Lunes Juan
    { profileId: 1, dayOfWeek: 7, startMin: 540, endMin: 1020, isActive: true }, // Lunes Juan
    { profileId: 1, dayOfWeek: 2, startMin: 540, endMin: 1020, isActive: true }, // Martes Juan
    { profileId: 3, dayOfWeek: 1, startMin: 480, endMin: 960, isActive: true },  // Lunes Ana
  ];

  for (const sched of schedules) {
    try {
      // Buscamos si ya existe un schedule con la misma clave única
      const existing = await prisma.schedule.findUnique({
        where: {
          profileId_dayOfWeek_startMin: {
            profileId: sched.profileId,
            dayOfWeek: sched.dayOfWeek,
            startMin: sched.startMin,
          },
        },
      });

      if (existing) {
        console.log(`[SEED] Schedule ya existe para profileId=${sched.profileId}, dayOfWeek=${sched.dayOfWeek} ⚠️`);
        continue;
      }

      await prisma.schedule.create({
        data: sched,
      });

      console.log(`[SEED] Schedule creado para profileId=${sched.profileId}, dayOfWeek=${sched.dayOfWeek} ✅`);
    } catch (error) {
      console.error(`[SEED] Error creando schedule para profileId=${sched.profileId}, dayOfWeek=${sched.dayOfWeek}:`, error);
    }
  }
}
