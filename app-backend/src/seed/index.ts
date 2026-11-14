import { seedAdmin } from "./admin.seed";
import { seedClients } from "./client.seed";
import { seedProfessionals } from "./professional.seed";
import { seedSchedules } from "./schedule.seed";
import { seedSpecialties } from "./specialty.seed";
// import { seedRoles } from './roles.seed';
// import { seedUsers } from './users.seed';

export const runSeeds = async () => {
  console.log("🌱 Ejecutando seeds...");

  try {
    await seedAdmin();
    await seedSpecialties();
    await seedProfessionals();
    await seedSchedules();
    await seedClients();
  } catch (err) {
    console.error("❌ Error crítico ejecutando seeds:", err);
    throw err; // Propagar para detener el arranque del servidor
  }

  console.log("✅ Seeds completados");
};
