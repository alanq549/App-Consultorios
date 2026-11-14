/// ARCHIVO: tests/catalog/professional-specialty.routes.test.ts
/// Tests de estructura de rutas y autorización para la elegibilidad ProfessionalSpecialty (Misión 2 - Fase 5).

import { describe, expect, it, vi, beforeEach } from "vitest";
import { createProfessionalSpecialtyRouter } from "@/modules/catalog/http/professional-specialty.routes";
import { ProfessionalSpecialtyController } from "@/modules/catalog/http/professional-specialty.controller";
import { createAdminRouter } from "@/modules/admin/admin.routes";
import { createProfessionalProfileRouter } from "@/modules/users/professionalprofile/professionalprofile.routes";
import { authorizeRole } from "@/middlewares/auth.middleware";

function buildMockController(): ProfessionalSpecialtyController {
  const mockDeps = {
    requestSpecialtyUseCase: { execute: vi.fn() },
    reviewSpecialtyUseCase: { execute: vi.fn() },
    profilePort: {
      findProfileIdByUserId: vi.fn(),
      lockProfileForUpdate: vi.fn(),
    },
  };
  return new ProfessionalSpecialtyController(
    mockDeps.requestSpecialtyUseCase as any,
    mockDeps.reviewSpecialtyUseCase as any,
    mockDeps.profilePort as any
  );
}

describe("Professional Specialty Routes & Authorization (Misión 2 - Fase 5)", () => {
  let router: ReturnType<typeof createProfessionalSpecialtyRouter>;
  let mockController: ProfessionalSpecialtyController;

  beforeEach(() => {
    mockController = buildMockController();
    router = createProfessionalSpecialtyRouter(mockController);
  });

  it("registra las rutas canónicas y legadas con sus métodos correspondientes", () => {
    const routeSpecs = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
        middlewaresCount: layer.route.stack.length,
      }));

    expect(routeSpecs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/specialties/:specialtyId",
          methods: ["post"],
        }),
        expect.objectContaining({
          path: "/me/specialties/:specialtyId/request",
          methods: ["post"],
        }),
        expect.objectContaining({
          path: "/:professionalId/specialties/:specialtyId/status",
          methods: ["patch"],
        }),
      ])
    );
  });

  it("createAdminRouter ensambla la ruta de revisión delegando al controlador inyectado (P2 - Finding 5)", () => {
    const adminRouter = createAdminRouter({
      professionalSpecialtyController: mockController,
    });

    const routeSpecs = adminRouter.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    expect(routeSpecs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/:professionalId/specialties/:specialtyId/status",
          methods: ["patch"],
        }),
      ])
    );
  });

  it("createProfessionalProfileRouter ensambla las rutas de solicitud y revisión delegando al controlador inyectado (P2 - Finding 5)", () => {
    const proRouter = createProfessionalProfileRouter({
      professionalSpecialtyController: mockController,
    });

    const routeSpecs = proRouter.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    expect(routeSpecs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/specialties/:specialtyId",
          methods: ["post"],
        }),
        expect.objectContaining({
          path: "/:professionalId/specialties/:specialtyId/status",
          methods: ["patch"],
        }),
      ])
    );
  });

  describe("Invariante de Autorización: ADMIN global revisa; OWNER / otros no revisan elegibilidad", () => {
    const adminGuard = authorizeRole("ADMIN");

    it("permite el acceso si el rol del usuario es ADMIN", () => {
      const req: any = { user: { id: 1, role: "ADMIN" } };
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      adminGuard(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("rechaza con 403 si el rol del usuario es OWNER (un OWNER de tenant no tiene permiso de admin global)", () => {
      const req: any = { user: { id: 2, role: "OWNER" } };
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      adminGuard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/No autorizado|Acceso denegado/) })
      );
    });

    it("rechaza con 403 si el rol del usuario es PROFESSIONAL o CLIENT", () => {
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      adminGuard({ user: { id: 3, role: "PROFESSIONAL" } } as any, res, next);
      expect(res.status).toHaveBeenCalledWith(403);

      adminGuard({ user: { id: 4, role: "CLIENT" } } as any, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("Invariante de Autorización: Solo un PROFESSIONAL puede solicitar especialidad", () => {
    const proGuard = authorizeRole("PROFESSIONAL");

    it("permite a un PROFESSIONAL solicitar especialidad", () => {
      const req: any = { user: { id: 5, role: "PROFESSIONAL" } };
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      proGuard(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it("rechaza con 403 a usuarios que no tengan rol PROFESSIONAL", () => {
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      proGuard({ user: { id: 6, role: "CLIENT" } } as any, res, next);
      expect(res.status).toHaveBeenCalledWith(403);

      proGuard({ user: { id: 7, role: "ADMIN" } } as any, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
