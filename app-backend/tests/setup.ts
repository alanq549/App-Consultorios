// test/setup.ts
import "dotenv/config";

const testDatabaseUrl = process.env.TEST_DATABASE_URL_PSG;

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL_PSG no está configurada en .env");
}

process.env.DATABASE_URL_psg = testDatabaseUrl;