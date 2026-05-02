import { runSeeds } from '@/seed';
import app, {  } from '../../app';
import "../../modules/appointments/appointment.worker"; // 👈 importa tu cron aquí


export const startServer = async () => {
  const PORT = process.env.PORT || 3000;
  await runSeeds(); // 👈 todos los seeds aquí

  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log("front: " + process.env.FRONTEND_URL);
  });

};

