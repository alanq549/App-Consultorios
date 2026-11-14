/// ARCHIVO: tests/catalog/specialty.routes.test.ts
/// Tests de estructura de rutas y autorización.
/// Usa createSpecialtyRouter(mockController) para evitar instanciar Prisma o el wiring raíz.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { createSpecialtyRouter } from "@/modules/catalog/http/specialty.routes";
import { SpecialtyController } from "@/modules/catalog/http/specialty.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { requireRole } from "@/middlewares/role.middleware";

// Controlador stub: métodos vacíos, solo para inspeccionar la estructura del router.
function buildMockController(): SpecialtyController {
  const mockDeps = {
    createSpecialtyUseCase: { execute: vi.fn() },
    listActiveSpecialtiesUseCase: { execute: vi.fn() },
    listInactiveSpecialtiesUseCase: { execute: vi.fn() },
    updateSpecialtyUseCase: { execute: vi.fn() },
    deactivateSpecialtyUseCase: { execute: vi.fn() },
    restoreSpecialtyUseCase: { execute: vi.fn() },
    listProfessionalPublicSpecialtiesUseCase: { execute: vi.fn() },
  };
  return new SpecialtyController(mockDeps as any);
}

describe("Specialty Routes & Authorization Specification (Misión 1 - Fase 5)", () => {
  let specialtyRoutes: ReturnType<typeof createSpecialtyRouter>;

  beforeEach(() => {
    specialtyRoutes = createSpecialtyRouter(buildMockController());
  });

  it("contiene todas las rutas esperadas en el enrutador de Catalog", () => {
    const routeSpecs = specialtyRoutes.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
        middlewaresCount: layer.route.stack.length,
      }));

    // Rutas públicas y protegidas
    expect(routeSpecs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/", methods: ["get"] }),
        expect.objectContaining({ path: "/professional/:profileId", methods: ["get"] }),
        expect.objectContaining({ path: "/soft-deleted", methods: ["get"] }),
        expect.objectContaining({ path: "/inactive", methods: ["get"] }),
        expect.objectContaining({ path: "/", methods: ["post"] }),
        expect.objectContaining({ path: "/:id", methods: ["patch"] }),
        expect.objectContaining({ path: "/:id/restore", methods: ["patch"] }),
        expect.objectContaining({ path: "/:id", methods: ["delete"] }),
      ]),
    );
  });

  describe("Protección por roles (requireRole('ADMIN'))", () => {
    let req: any;
    let res: any;
    let next: any;
    const adminGuard = requireRole("ADMIN");

    beforeEach(() => {
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      next = vi.fn();
    });

    it("bloquea con 403 si el usuario no tiene rol ADMIN (ej. CLIENT)", () => {
      req = { user: { id: 1, role: "CLIENT" } };
      adminGuard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "No tienes permisos para esta acción" }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("bloquea con 403 si el usuario es PROFESSIONAL", () => {
      req = { user: { id: 2, role: "PROFESSIONAL" } };
      adminGuard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("permite el paso (next) cuando el rol es ADMIN (D1)", () => {
      req = { user: { id: 3, role: "ADMIN" } };
      adminGuard(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("Autenticación obligatoria (authMiddleware)", () => {
    let req: any;
    let res: any;
    let next: any;

    beforeEach(() => {
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      next = vi.fn();
    });

    it("rechaza con 401 si no hay encabezado Authorization", () => {
      req = {
        get: vi.fn().mockReturnValue(undefined),
      };

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Token requerido" });
      expect(next).not.toHaveBeenCalled();
    });

    it("rechaza con 401 si el formato del token es inválido", () => {
      req = {
        get: vi.fn().mockReturnValue("Basic user:pass"),
      };

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Token requerido" });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
