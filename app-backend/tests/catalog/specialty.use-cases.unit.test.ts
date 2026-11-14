/// ARCHIVO: tests/catalog/specialty.use-cases.unit.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { Specialty } from "@/modules/catalog/domain/specialty.entity";
import { SpecialtyRepository } from "@/modules/catalog/domain/repositories/specialty.repository";
import { TransactionContext } from "@/shared/types/transaction-context";
import { CreateSpecialtyUseCase } from "@/modules/catalog/application/use-cases/create-specialty.use-case";
import { ListActiveSpecialtiesUseCase } from "@/modules/catalog/application/use-cases/list-active-specialties.use-case";
import { ListInactiveSpecialtiesUseCase } from "@/modules/catalog/application/use-cases/list-inactive-specialties.use-case";
import { UpdateSpecialtyUseCase } from "@/modules/catalog/application/use-cases/update-specialty.use-case";
import { DeactivateSpecialtyUseCase } from "@/modules/catalog/application/use-cases/deactivate-specialty.use-case";
import { RestoreSpecialtyUseCase } from "@/modules/catalog/application/use-cases/restore-specialty.use-case";
import { GetSpecialtyByIdUseCase } from "@/modules/catalog/application/use-cases/get-specialty-by-id.use-case";
import { ListProfessionalPublicSpecialtiesUseCase } from "@/modules/catalog/application/use-cases/list-professional-public-specialties.use-case";
import { ActiveAffiliationCheckerPort } from "@/modules/catalog/application/ports/active-affiliation-checker.port";
import {
  ProfessionalPublicSpecialtyQueryPort,
  ApprovedProfessionalSpecialtyRecord,
} from "@/modules/catalog/application/ports/professional-public-specialty-query.port";
import { CatalogTaxonomyService } from "@/modules/catalog/infrastructure/catalog-taxonomy.service";
import {
  DuplicateSpecialtyError,
  SpecialtyNotFoundError,
  SpecialtyInactiveError,
} from "@/modules/catalog/domain/catalog-errors";

class InMemorySpecialtyRepository implements SpecialtyRepository {
  private items: Specialty[] = [];
  private nextId = 1;

  async findById(id: number, _txContext?: TransactionContext): Promise<Specialty | null> {
    const found = this.items.find((s) => s.id === id);
    return found ?? null;
  }

  async findByName(name: string, _txContext?: TransactionContext): Promise<Specialty | null> {
    const found = this.items.find(
      (s) => s.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    return found ?? null;
  }

  async listActive(_txContext?: TransactionContext): Promise<Specialty[]> {
    return this.items
      .filter((s) => s.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async listInactive(_txContext?: TransactionContext): Promise<Specialty[]> {
    return this.items
      .filter((s) => !s.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async create(
    data: {
      name: string;
      description?: string | null;
      isActive?: boolean;
    },
    _txContext?: TransactionContext,
  ): Promise<Specialty> {
    const specialty = Specialty.create({
      id: this.nextId++,
      name: data.name,
      description: data.description,
      isActive: data.isActive ?? true,
    });
    this.items.push(specialty);
    return specialty;
  }

  async update(
    id: number,
    data: { name?: string; description?: string | null; isActive?: boolean },
    _txContext?: TransactionContext,
  ): Promise<Specialty> {
    const specialty = this.items.find((s) => s.id === id);
    if (!specialty) {
      throw new Error("Item not found");
    }
    specialty.update(data);
    return specialty;
  }
}

class FakeAffiliationChecker implements ActiveAffiliationCheckerPort {
  private activeAffiliations = new Set<string>();

  setAffiliated(profileId: number, tenantId: number, active: boolean) {
    const key = `${profileId}:${tenantId}`;
    if (active) {
      this.activeAffiliations.add(key);
    } else {
      this.activeAffiliations.delete(key);
    }
  }

  async hasActiveAffiliation(
    professionalProfileId: number,
    tenantId: number,
  ): Promise<boolean> {
    return this.activeAffiliations.has(`${professionalProfileId}:${tenantId}`);
  }

  async findActiveAffiliationId(
    professionalProfileId: number,
    tenantId: number,
  ): Promise<number | null> {
    return this.activeAffiliations.has(`${professionalProfileId}:${tenantId}`)
      ? professionalProfileId * 1000 + tenantId
      : null;
  }
}

class FakeProfessionalSpecialtyQuery
  implements ProfessionalPublicSpecialtyQueryPort
{
  public records: Map<number, ApprovedProfessionalSpecialtyRecord[]> = new Map();

  async findApprovedSpecialtiesByProfessional(
    professionalId: number,
    _txContext?: TransactionContext,
  ): Promise<ApprovedProfessionalSpecialtyRecord[]> {
    return this.records.get(professionalId) ?? [];
  }
}

describe("Catalog Taxonomy Use Cases — Unit Tests (Misión 1 - Fase 5)", () => {
  let repo: InMemorySpecialtyRepository;
  let createUseCase: CreateSpecialtyUseCase;
  let listActiveUseCase: ListActiveSpecialtiesUseCase;
  let listInactiveUseCase: ListInactiveSpecialtiesUseCase;
  let updateUseCase: UpdateSpecialtyUseCase;
  let deactivateUseCase: DeactivateSpecialtyUseCase;
  let restoreUseCase: RestoreSpecialtyUseCase;
  let getByIdUseCase: GetSpecialtyByIdUseCase;
  let taxonomyService: CatalogTaxonomyService;
  let fakeAffiliationChecker: FakeAffiliationChecker;
  let fakeSpecialtyQuery: FakeProfessionalSpecialtyQuery;
  let listProfessionalPublicSpecialtiesUseCase: ListProfessionalPublicSpecialtiesUseCase;

  beforeEach(() => {
    repo = new InMemorySpecialtyRepository();
    createUseCase = new CreateSpecialtyUseCase(repo);
    listActiveUseCase = new ListActiveSpecialtiesUseCase(repo);
    listInactiveUseCase = new ListInactiveSpecialtiesUseCase(repo);
    updateUseCase = new UpdateSpecialtyUseCase(repo);
    deactivateUseCase = new DeactivateSpecialtyUseCase(repo);
    restoreUseCase = new RestoreSpecialtyUseCase(repo);
    getByIdUseCase = new GetSpecialtyByIdUseCase(repo);
    taxonomyService = new CatalogTaxonomyService(repo);

    fakeAffiliationChecker = new FakeAffiliationChecker();
    fakeSpecialtyQuery = new FakeProfessionalSpecialtyQuery();
    listProfessionalPublicSpecialtiesUseCase =
      new ListProfessionalPublicSpecialtiesUseCase(
        fakeAffiliationChecker,
        fakeSpecialtyQuery,
      );
  });

  describe("CreateSpecialtyUseCase", () => {
    it("crea exitosamente una especialidad activa", async () => {
      const result = await createUseCase.execute({
        name: "Cardiología",
        description: "Enfermedades cardiovasculares",
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe("Cardiología");
      expect(result.description).toBe("Enfermedades cardiovasculares");
      expect(result.isActive).toBe(true);
      expect(typeof result.createdAt).toBe("string");
      expect(typeof result.updatedAt).toBe("string");
    });

    it("rechaza duplicados cuando ya existe una especialidad activa con el mismo nombre", async () => {
      await createUseCase.execute({ name: "Pediatría" });

      await expect(
        createUseCase.execute({ name: "Pediatría" }),
      ).rejects.toThrow(DuplicateSpecialtyError);

      await expect(
        createUseCase.execute({ name: "  Pediatría  " }),
      ).rejects.toThrow(DuplicateSpecialtyError);
    });

    it("reactiva una especialidad soft-deleted si se vuelve a crear con el mismo nombre", async () => {
      const created = await createUseCase.execute({
        name: "Dermatología",
        description: "Descripción original",
      });

      await deactivateUseCase.execute(created.id);
      const inactiveList = await listInactiveUseCase.execute();
      expect(inactiveList).toHaveLength(1);

      // Re-crear con nuevo description
      const reactivated = await createUseCase.execute({
        name: "Dermatología",
        description: "Nueva descripción reactivada",
      });

      expect(reactivated.id).toBe(created.id);
      expect(reactivated.isActive).toBe(true);
      expect(reactivated.description).toBe("Nueva descripción reactivada");

      const activeList = await listActiveUseCase.execute();
      expect(activeList).toHaveLength(1);
      expect(activeList[0].id).toBe(created.id);
    });
  });

  describe("ListActiveSpecialtiesUseCase & ListInactiveSpecialtiesUseCase", () => {
    it("lista solo especialidades activas ordenadas alfabéticamente", async () => {
      await createUseCase.execute({ name: "Traumatología" });
      await createUseCase.execute({ name: "Alergología" });
      const cardio = await createUseCase.execute({ name: "Cardiología" });

      // Desactivar cardiología
      await deactivateUseCase.execute(cardio.id);

      const active = await listActiveUseCase.execute();
      expect(active).toHaveLength(2);
      expect(active[0].name).toBe("Alergología");
      expect(active[1].name).toBe("Traumatología");

      const inactive = await listInactiveUseCase.execute();
      expect(inactive).toHaveLength(1);
      expect(inactive[0].name).toBe("Cardiología");
      expect(inactive[0].isActive).toBe(false);
    });
  });

  describe("UpdateSpecialtyUseCase", () => {
    it("actualiza campos permitidos de la especialidad", async () => {
      const created = await createUseCase.execute({
        name: "Neurología",
        description: "Original",
      });

      const updated = await updateUseCase.execute(created.id, {
        name: "Neurología Clínica",
        description: "Actualizada",
      });

      expect(updated.name).toBe("Neurología Clínica");
      expect(updated.description).toBe("Actualizada");
    });

    it("lanza SpecialtyNotFoundError si el id no existe", async () => {
      await expect(
        updateUseCase.execute(999, { name: "Inexistente" }),
      ).rejects.toThrow(SpecialtyNotFoundError);
    });

    it("rechaza si se renombra al nombre de otra especialidad existente", async () => {
      await createUseCase.execute({ name: "Ginecología" });
      const urologia = await createUseCase.execute({ name: "Urología" });

      await expect(
        updateUseCase.execute(urologia.id, { name: "Ginecología" }),
      ).rejects.toThrow(DuplicateSpecialtyError);
    });

    it("permite actualizar conservando su propio nombre", async () => {
      const gineco = await createUseCase.execute({ name: "Ginecología" });

      const updated = await updateUseCase.execute(gineco.id, {
        name: "Ginecología",
        description: "Nueva descripción",
      });

      expect(updated.description).toBe("Nueva descripción");
    });
  });

  describe("DeactivateSpecialtyUseCase (Soft Delete) & RestoreSpecialtyUseCase", () => {
    it("desactiva una especialidad marcando isActive = false sin borrar fila (D1)", async () => {
      const created = await createUseCase.execute({ name: "Oftalmología" });

      const deactivated = await deactivateUseCase.execute(created.id);
      expect(deactivated.isActive).toBe(false);

      const found = await getByIdUseCase.execute(created.id);
      expect(found).toBeDefined();
      expect(found.isActive).toBe(false);
    });

    it("lanza SpecialtyNotFoundError al desactivar un id inexistente", async () => {
      await expect(deactivateUseCase.execute(999)).rejects.toThrow(
        SpecialtyNotFoundError,
      );
    });

    it("restaura una especialidad previamente desactivada", async () => {
      const created = await createUseCase.execute({ name: "Otorrinolaringología" });
      await deactivateUseCase.execute(created.id);

      const restored = await restoreUseCase.execute(created.id);
      expect(restored.isActive).toBe(true);

      const activeList = await listActiveUseCase.execute();
      expect(activeList.some((s) => s.id === created.id)).toBe(true);
    });

    it("lanza SpecialtyNotFoundError al restaurar un id inexistente", async () => {
      await expect(restoreUseCase.execute(999)).rejects.toThrow(
        SpecialtyNotFoundError,
      );
    });
  });

  describe("CatalogTaxonomyService — Contrato inter-módulos", () => {
    it("findActiveById devuelve el DTO si la especialidad existe y está activa", async () => {
      const created = await createUseCase.execute({ name: "Psiquiatría" });

      const found = await taxonomyService.findActiveById(created.id);
      expect(found).not.toBeNull();
      expect(found?.name).toBe("Psiquiatría");
    });

    it("findActiveById devuelve null si la especialidad está desactivada o no existe", async () => {
      const created = await createUseCase.execute({ name: "Nutriología" });
      await deactivateUseCase.execute(created.id);

      const inactiveFound = await taxonomyService.findActiveById(created.id);
      expect(inactiveFound).toBeNull();

      const notFound = await taxonomyService.findActiveById(9999);
      expect(notFound).toBeNull();
    });

    it("ensureActiveSpecialtyExists lanza SpecialtyNotFoundError si no existe", async () => {
      await expect(
        taxonomyService.ensureActiveSpecialtyExists(9999),
      ).rejects.toThrow(SpecialtyNotFoundError);
    });

    it("ensureActiveSpecialtyExists lanza SpecialtyInactiveError si está desactivada", async () => {
      const created = await createUseCase.execute({ name: "Oncología" });
      await deactivateUseCase.execute(created.id);

      await expect(
        taxonomyService.ensureActiveSpecialtyExists(created.id),
      ).rejects.toThrow(SpecialtyInactiveError);
    });
  });

  describe("ListProfessionalPublicSpecialtiesUseCase — Proyección pública (Hallazgos 1 y 2)", () => {
    it("devuelve null si el profesional no tiene afiliación activa en el tenant", async () => {
      fakeAffiliationChecker.setAffiliated(10, 1, false);

      const result = await listProfessionalPublicSpecialtiesUseCase.execute({
        profileId: 10,
        tenantId: 1,
      });

      expect(result).toBeNull();
    });

    it("devuelve proyección pública explícita de especialidades aprobadas sin filtrar estados internos", async () => {
      fakeAffiliationChecker.setAffiliated(10, 1, true);

      fakeSpecialtyQuery.records.set(10, [
        {
          specialtyId: 5,
          specialty: {
            id: 5,
            name: "Pediatría",
            description: "Atención pediátrica",
          },
        },
      ]);

      const result = await listProfessionalPublicSpecialtiesUseCase.execute({
        profileId: 10,
        tenantId: 1,
      });

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        specialtyId: 5,
        name: "Pediatría",
        description: "Atención pediátrica",
        specialty: {
          id: 5,
          name: "Pediatría",
          description: "Atención pediátrica",
        },
      });

      // Garantizar que campos internos de elegibilidad (status, reviewedAt) no existan en la respuesta pública
      expect((result![0] as any).status).toBeUndefined();
      expect((result![0] as any).reviewedAt).toBeUndefined();
      expect((result![0] as any).professionalId).toBeUndefined();
    });
  });
});
