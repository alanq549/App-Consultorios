// test/setup.ts
import "dotenv/config";

const testDatabaseUrl = process.env.TEST_DATABASE_URL_PSG;

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL_PSG no está configurada en .env");
}

// Sobreescribir DATABASE_URL_psg para que Prisma use la BD de test durante Vitest
process.env.DATABASE_URL_psg = testDatabaseUrl;