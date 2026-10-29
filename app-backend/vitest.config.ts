import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  test: {
    setupFiles: ["./tests/setup.ts"],
    // Las pruebas de integración hablan con PostgreSQL remoto (Neon) y su latencia hace que
    // varios archivos rocen el límite por defecto (5 s), sobre todo cuando la base está fría o
    // la suite corre con carga. Un límite holgado evita fallos por latencia sin ocultar fallos
    // funcionales, que siguen siendo inmediatos.
    testTimeout: 20_000,
    // Indica a Vitest que busque solo archivos TypeScript en tests/ o src/
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    // Excluye explícitamente dist y node_modules para evitar ejecutar artefactos compilados
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});