/// ARCHIVO: tests/catalog/service-offer.routes.test.ts
/// Pruebas de estructura y autorización de las rutas de ofertas reservables (Misión 4 - Fase 5).
/// Usa createServiceOfferRouter(mockController) para no instanciar Prisma ni el wiring raíz.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { createServiceOfferRouter } from "@/modules/catalog/http/service-offer.routes";
import { ServiceOfferController } from "@/modules/catalog/http/service-offer.controller";
import { requireRole } from "@/middlewares/role.middleware";

function buildMockController(): ServiceOfferController {
  const mockDeps = {
    createServiceOfferUseCase: { execute: vi.fn() },
    updateServiceOfferUseCase: { execute: vi.fn() },
    deactivateServiceOfferUseCase: { execute: vi.fn() },
    listProfessionalPublicOffersUseCase: { execute: vi.fn() },
  };
  return new ServiceOfferController(mockDeps as any);
}

describe("ServiceOffer Routes & Authorization (Misión 4 - Fase 5)", () => {
  let routes: ReturnType<typeof createServiceOfferRouter>;

  beforeEach(() => {
    routes = createServiceOfferRouter(buildMockController());
  });

  it("expone las rutas del CRUD de ofertas montadas en /api/services", () => {
    const routeSpecs = routes.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
        middlewaresCount: layer.route.stack.length,
      }));

    expect(routeSpecs).toEqual(
      expect.arrayContaining([
        // Público: resolución de tenant + handler.
        expect.objectContaining({
          path: "/professional/:profileId",
          methods: ["get"],
          middlewaresCount: 2,
        }),
        // Escrituras: auth + rol + resolución de tenant + handler (D4).
        expect.objectContaining({
          path: "/",
          methods: ["post"],
          middlewaresCount: 4,
        }),
        expect.objectContaining({
          path: "/:id",
          methods: ["patch"],
          middlewaresCount: 4,
        }),
        expect.objectContaining({
          path: "/:id",
          methods: ["delete"],
          middlewaresCount: 4,
        }),
      ]),
    );
  });

  it("no expone rutas de escritura sin el contexto de tenant (todas las escrituras exigen X-Tenant-ID)", () => {
    const writeLayers = routes.stack
      .filter((layer: any) => layer.route && layer.route.path !== "/professional/:profileId")
      .map((layer: any) => layer.route.stack.length);

    expect(writeLayers.every((count: number) => count === 4)).toBe(true);
  });

  describe("Protección por roles (requireRole('PROFESSIONAL'))", () => {
    const guard = requireRole("PROFESSIONAL");

    it("bloquea con 403 a un CLIENT", () => {
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
      const next = vi.fn();

      guard({ user: { id: 1, role: "CLIENT" } } as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "No tienes permisos para esta acción" }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("permite el paso a un PROFESSIONAL", () => {
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
      const next = vi.fn();

      guard({ user: { id: 2, role: "PROFESSIONAL" } } as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
