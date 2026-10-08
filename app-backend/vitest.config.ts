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
    // Indica a Vitest que busque solo archivos TypeScript en tests/ o src/
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    // Excluye explícitamente dist y node_modules para evitar ejecutar artefactos compilados
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});