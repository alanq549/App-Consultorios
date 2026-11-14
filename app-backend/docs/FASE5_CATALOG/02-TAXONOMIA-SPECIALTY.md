# Misión 1 — Migrar taxonomía Specialty

## Estado
**✅ APROBADA — 12.ª iteración — 2026-11-13.** Implementación canónica del CRUD de taxonomía médica bajo `src/modules/catalog/`, separación estricta de capas, Composition Root de aplicación (`src/app.wiring.ts`) como único orquestador cross-módulo, inyección de dependencias desde el Composition Root hacia Auth y Services, `app.ts` consume `specialtyRouter` directamente desde `@/app.wiring`, todos los adaptadores legacy que no tenían consumidores han sido retirados (`specialty.service.ts`, `specialty.controller.ts`, `specialty.routes.ts`), alineación total con la convención de carpetas, abstracción transaccional única y suite completa de 43 pruebas.

| Iteración | Resultado | Hallazgos |
|-----------|-----------|-----------|
| 1ª | No aprobada | P2×4: proyección pública, controller con Prisma, dependencia cruzada de infraestructura, `any` en adaptador |
| 2ª | No aprobada | P2×3 resueltos; quedaban: wiring en controller, `PrismaActiveAffiliationChecker` importado directamente, `Prisma.TransactionClient` en puertos |
| 3ª | No aprobada | P2×2 resueltos; quedaba: `Prisma.TransactionClient` en `specialty-repository.port.ts` y en contrato público |
| 4ª | No aprobada | P1: fallback silencioso en `extractPrismaClient`; P2: Catalog instanciaba infraestructura concreta de Profiles |
| 5ª | No aprobada | P1: registro de profesionales pasaba `tx` crudo a `catalogTaxonomyService` provocando `CatalogTransactionError` |
| 6ª | No aprobada | P2: Auth dependía de un adaptador de infraestructura de Catalog; P2: pruebas anunciaban rollback sin verificar base de datos real |
| 7ª | No aprobada | P2: barrel de Catalog exportaba instancia de infraestructura (`catalogTaxonomyService`); P2: estructura de puertos divergía de `ARCHITECTURE_REFACTOR.md:81` y duplicaba `TransactionContext` |
| 8ª | No aprobada | P2: Auth y Services importaban dependencias desde el composition root (inversión de dependencias); P3: rutas obsoletas en doc |
| 11ª | No aprobada | P2: `specialty.service.ts` importaba `CatalogUseCases` del wiring interno de Catalog; P3: doc con enlace obsoleto a `@/app.wiring` como consumo directo |
| **12ª** | **✅ Aprobada** | P2 resuelto: `specialty.service.ts` retirada (sin consumidores); P3 resuelto: doc actualizado con estado vigente |

## Objetivo
Dar ownership efectivo del CRUD de `Specialty` al contexto Catalog, manteniendo su alcance global aprobado en Misión 0 (D1 y D6).

## Por qué
Anteriormente `SpecialtyService` mezclaba persistencia directa, soft delete, restauración y listado, devolviendo entidades Prisma en crudo sin serialización DTO controlada, y otros módulos consultaban el modelo Prisma directamente.

## Hallazgos de Revisión Resueltos

1. **[P2 Resuelto] Proyección pública de especialidades del profesional:**
   - Se eliminó la exposición indiscriminada de filas de `ProfessionalSpecialty` que exponían estados no públicos (`PENDING`, `REJECTED`, `SUSPENDED`).
   - Se implementó [`ListProfessionalPublicSpecialtiesUseCase`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/list-professional-public-specialties.use-case.ts) con consulta que filtra estrictamente por `status: "APPROVED"` y `specialty.isActive: true`.
   - Se diseñó el DTO explícito [`ProfessionalPublicSpecialtyDTO`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/dto/professional-public-specialty.dto.ts) que jamás expone estados clínicos ni datos de auditoría interna.

2. **[P2 Resuelto] Controller desacoplado de infraestructura y composition root:**
   - [`SpecialtyController`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/http/specialty.controller.ts) es una clase pura de presentación que recibe todos sus casos de uso mediante inyección de dependencias (`SpecialtyControllerDependencies`).
   - El controlador no importa Prisma, repositorios ni infraestructura, cumpliendo estrictamente la regla `presentation -> application -> domain` de `ARCHITECTURE_REFACTOR.md:177`.
   - Toda la instanciación e inyección se realiza en el Composition Root [`catalog.wiring.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/catalog.wiring.ts).

3. **[P2 Resuelto] Abstracción de contexto transaccional y repositorio desacoplado:**
   - Se eliminó toda importación de Prisma en [`SpecialtyRepository`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/domain/repositories/specialty.repository.ts) y en [`CatalogTaxonomyContract`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/ports/catalog-taxonomy.contract.ts).
   - Se adoptó la abstracción única compartida [`TransactionContext`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/shared/types/transaction-context.ts) bajo `src/shared/types/`.

4. **[P1 Resuelto] Contexto transaccional sellado — sin fallback silencioso:**
   - [`prisma-transaction-context.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/prisma/prisma-transaction-context.ts) usa un **símbolo privado de módulo** (`TX_CLIENT = Symbol("prisma.tx")`) como única clave sellada. Ningún código externo puede falsificar un contexto válido.
   - `extractPrismaClient` lanza `CatalogTransactionError` si recibe un `TransactionContext` que no fue creado por `createPrismaTransactionContext`. Eliminado el fallback al cliente global y eliminados todos los `any`/casts inseguros.
   - 4 pruebas unitarias en [`tests/catalog/transaction-context.unit.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/transaction-context.unit.test.ts) verifican: sin contexto → cliente global; contexto fabricado → `CatalogTransactionError`; impostor con `$executeRaw` → `CatalogTransactionError`; contexto válido → tx client correcto.

5. **[P2 Resuelto] Catalog no depende de la implementación concreta de Profiles:**
   - [`catalog.wiring.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/catalog.wiring.ts) recibe `ActiveAffiliationCheckerPort` como parámetro externo (`CatalogDependencies`). No importa ningún módulo de Profiles.
   - [`src/app.wiring.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/app.wiring.ts) es el nuevo **Composition Root de Aplicación**: único punto que conoce implementaciones concretas cross-módulo, instancia `PrismaActiveAffiliationChecker` (de Profiles) y lo pasa a `createCatalogCompositionRoot(deps)`.
   - El router de specialty se construye con [`createSpecialtyRouter(controller)`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/http/specialty.routes.ts): función factory que permite testear la estructura de rutas sin instanciar Prisma ni el wiring raíz.
   - `profiles/index.ts` mantiene su rol de barrel público; su único consumidor de clase concreta ahora es `app.wiring.ts`.

6. **[P2 Resuelto] Desacoplamiento Auth-Catalog mediante transversal de base de datos (`shared/database`):**
   - Se eliminó la exportación de adaptadores de infraestructura (`createPrismaTransactionContext`) del barrel público de Catalog ([`src/modules/catalog/index.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/index.ts)). Catalog solo exporta sus contratos de aplicación y tipos de dominio.
   - Se creó el adaptador transversal en [`src/shared/database/prisma-transaction-context.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/shared/database/prisma-transaction-context.ts), perteneciente a la infraestructura de persistencia transversal de la aplicación (`shared/database`), junto a `prisma.ts`.
   - [`src/modules/auth/auth.service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/auth/auth.service.ts) ahora importa `createPrismaTransactionContext` desde `@/shared/database/prisma-transaction-context`, consumiendo únicamente el servicio de negocio (`catalogTaxonomyService`) desde `@/modules/catalog`. Ningún módulo de dominio importa infraestructura de otro módulo.

7. **[P2 Resuelto] Claridad metodológica y alcance de las pruebas transaccionales:**
   - La suite [`tests/catalog/auth-registration-transaction.unit.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/auth-registration-transaction.unit.test.ts) (5 pruebas) se clasifica y documenta explícitamente como **unitaria**.
   - No sobre-declara garantías físicas de rollback de PostgreSQL; en su lugar, valida el flujo de control, la propagación interactiva sobre el `txClient`, el fail-fast que impide la invocación de `tx.professionalProfile.create`, y simula el mecanismo de descarte de mutaciones pendientes ante excepciones.

8. **[P2 Resuelto] Barrel de Catalog puramente declarativo (sin instancias de infraestructura):**
   - Se eliminó la exportación de la instancia `catalogTaxonomyService` de [`src/modules/catalog/index.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/index.ts). El módulo ahora solo exporta el contrato tipado [`CatalogTaxonomyContract`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/ports/catalog-taxonomy.contract.ts) y tipos de dominio.
   - La instancia concreta de `CatalogTaxonomyService` es creada y conectada en el Composition Root de aplicación ([`src/app.wiring.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/app.wiring.ts)), inyectándole el repositorio de Catalog.
   - Los consumidores externos ([`auth.service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/auth/auth.service.ts) y [`service.service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/services/service.service.ts)) reciben `catalogTaxonomyService` inyectado desde el Composition Root mediante `injectDependencies()`, sin importar `@/app.wiring` ni infraestructura concreta.

9. **[P2 Resuelto] Alineación estricta con la estructura objetivo (`ARCHITECTURE_REFACTOR.md:81`):**
   - Se eliminó la carpeta no estándar `src/modules/catalog/domain/ports/`.
   - El contrato del repositorio de dominio se ubicó canónicamente en [`src/modules/catalog/domain/repositories/specialty.repository.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/domain/repositories/specialty.repository.ts), respetando la convención del proyecto (`domain/repositories`).
   - Los puertos de interacción externa e inter-módulo se mantienen estrictamente bajo `src/modules/catalog/application/ports/`.
   - Se unificó la abstracción transaccional en una única interfaz compartida [`TransactionContext`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/shared/types/transaction-context.ts) en `src/shared/types/transaction-context.ts`, eliminando duplicaciones estructurales entre dominio y shared.

10. **[P2 Resuelto] Inversión de dependencias corregida: inyección desde el Composition Root hacia Auth y Services:**
    - Ni [`auth.service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/auth/auth.service.ts) ni [`service.service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/services/service.service.ts) importan el composition root (`@/app.wiring`).
    - Ambos servicios definen interfaces de dependencias (`AuthServiceDependencies`, `ServiceServiceDependencies`) basadas estrictamente en el contrato público [`CatalogTaxonomyContract`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/ports/catalog-taxonomy.contract.ts).
    - El Composition Root de aplicación ([`src/app.wiring.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/app.wiring.ts)) es quien conoce a los módulos y les inyecta la instancia requerida vía `injectDependencies`. La dirección de dependencias es estrictamente: `Composition Root -> Módulos de negocio`.

11. **[P2 Resuelto] Adaptadores legacy desacoplados del Composition Root — fachada retirada:**
    - Eliminados `src/modules/specialty/specialty.controller.ts` y `src/modules/specialty/specialty.routes.ts`: eran puro re-export de símbolos de `@/app.wiring`, sin lógica propia.
    - [`src/app.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/app.ts) ahora importa `{ specialtyRouter }` directamente de `@/app.wiring` y lo monta en `/api/specialties`. `app.ts` es la capa de registro de rutas y su relación con el wiring es correcta.
    - `src/modules/specialty/specialty.service.ts` _(eliminado)_: no tenía consumidores externos; fue retirada en lugar de añadir una interfaz para un adaptador sin uso. Eliminados también `CatalogUseCases` de `catalog.wiring.ts` y la llamada a `SpecialtyService.injectDependencies` de `app.wiring.ts`.

## Archivos creados y adaptados

### 1. Módulo canónico `src/modules/catalog/`
- **Frontera pública (`src/modules/catalog/index.ts`):** Exporta contratos, tipos, esquemas y DTOs públicos (sin instancias de infraestructura).
- **Wiring del módulo (`src/modules/catalog/catalog.wiring.ts`):** Fábrica interna de casos de uso y controlador HTTP.
- **Dominio (`src/modules/catalog/domain/`):**
  - [`specialty.entity.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/domain/specialty.entity.ts): Entidad con métodos de ciclo de vida (`deactivate`, `restore`, `update`, `toSnapshot`).
  - [`catalog-errors.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/domain/catalog-errors.ts): Errores de dominio tipados.
  - [`repositories/specialty.repository.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/domain/repositories/specialty.repository.ts): Contrato canónico de repositorio en dominio.
- **Aplicación (`src/modules/catalog/application/`):**
  - [`ports/catalog-taxonomy.contract.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/ports/catalog-taxonomy.contract.ts): Contrato inter-módulo y DTO `TaxonomySpecialtyDTO`.
  - [`ports/active-affiliation-checker.port.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/ports/active-affiliation-checker.port.ts): Puerto para verificación de pertenencia por afiliación.
  - [`ports/professional-public-specialty-query.port.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/ports/professional-public-specialty-query.port.ts): Puerto para consulta de especialidades aprobadas.
  - [`dto/specialty.dto.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/dto/specialty.dto.ts): Esquemas Zod y mapper DTO.
  - [`dto/professional-public-specialty.dto.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/dto/professional-public-specialty.dto.ts): DTO para proyección pública.
  - Casos de uso:
    - [`create-specialty.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/create-specialty.use-case.ts)
    - [`list-active-specialties.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/list-active-specialties.use-case.ts)
    - [`list-inactive-specialties.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/list-inactive-specialties.use-case.ts)
    - [`update-specialty.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/update-specialty.use-case.ts)
    - [`deactivate-specialty.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/deactivate-specialty.use-case.ts)
    - [`restore-specialty.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/restore-specialty.use-case.ts)
    - [`get-specialty-by-id.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/get-specialty-by-id.use-case.ts)
    - [`list-professional-public-specialties.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/list-professional-public-specialties.use-case.ts)
- **Infraestructura (`src/modules/catalog/infrastructure/`):**
  - [`prisma/prisma-specialty-repository.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/prisma/prisma-specialty-repository.ts)
  - [`prisma/prisma-professional-public-specialty-query.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/prisma/prisma-professional-public-specialty-query.ts)
  - [`prisma/prisma-transaction-context.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/prisma/prisma-transaction-context.ts)
  - [`catalog-taxonomy.service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/catalog-taxonomy.service.ts)
- **HTTP (`src/modules/catalog/http/`):**
  - [`specialty.controller.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/http/specialty.controller.ts): Clase pura sin imports de infraestructura.
  - [`specialty.routes.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/http/specialty.routes.ts): Fábrica `createSpecialtyRouter(controller)`.
  - [`catalog-error-mapper.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/http/catalog-error-mapper.ts)

### 2. Composition Root de Aplicación
- [`src/app.wiring.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/app.wiring.ts): Ensambla dependencias cross-módulo (`affiliationChecker` de Profiles -> Catalog) e instancia `catalogTaxonomyService`.

### 3. Transversales de infraestructura compartida
- [`src/shared/types/transaction-context.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/shared/types/transaction-context.ts): Abstracción única compartida de contexto transaccional.
- [`src/shared/database/prisma-transaction-context.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/shared/database/prisma-transaction-context.ts): Adaptador de contexto transaccional para Prisma.
    - [`create-specialty.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/create-specialty.use-case.ts)
    - [`list-active-specialties.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/list-active-specialties.use-case.ts)
    - [`list-inactive-specialties.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/list-inactive-specialties.use-case.ts)
    - [`update-specialty.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/update-specialty.use-case.ts)
    - [`deactivate-specialty.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/deactivate-specialty.use-case.ts)
    - [`restore-specialty.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/restore-specialty.use-case.ts)
    - [`get-specialty-by-id.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/get-specialty-by-id.use-case.ts)
    - [`list-professional-public-specialties.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/list-professional-public-specialties.use-case.ts)
- **Infraestructura (`src/modules/catalog/infrastructure/`):**
  - [`prisma/prisma-specialty-repository.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/prisma/prisma-specialty-repository.ts)
  - [`prisma/prisma-professional-public-specialty-query.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/prisma/prisma-professional-public-specialty-query.ts)
  - [`prisma/prisma-transaction-context.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/prisma/prisma-transaction-context.ts)
  - [`catalog-taxonomy.service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/catalog-taxonomy.service.ts)
- **HTTP (`src/modules/catalog/http/`):**
  - [`specialty.controller.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/http/specialty.controller.ts): Clase pura sin imports de infraestructura.
  - [`specialty.routes.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/http/specialty.routes.ts)
  - [`catalog-error-mapper.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/http/catalog-error-mapper.ts)

### 2. Composition Root de Aplicación
- [`src/app.wiring.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/app.wiring.ts): Ensambla dependencias cross-módulo (`affiliationChecker` de Profiles -> Catalog) e instancia `catalogTaxonomyService`.

### 3. Transversales de infraestructura compartida
- [`src/shared/types/transaction-context.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/shared/types/transaction-context.ts): Abstracción única compartida de contexto transaccional.
- [`src/shared/database/prisma-transaction-context.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/shared/database/prisma-transaction-context.ts): Adaptador de contexto transaccional para Prisma.

### 4. Frontera pública de Profiles
- [`src/modules/profiles/index.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/profiles/index.ts): Exporta `ActiveAffiliationChecker` y `PrismaActiveAffiliationChecker` para consumo del composition root.

### 5. Adaptadores de compatibilidad legacy
- [`specialty.service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/specialty/specialty.service.ts), [`specialty.controller.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/specialty/specialty.controller.ts), [`specialty.dto.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/specialty/specialty.dto.ts), [`specialty.routes.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/specialty/specialty.routes.ts).

### 6. Consumo inter-módulo por Inyección de Dependencias
- [`src/modules/auth/auth.service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/auth/auth.service.ts): Recibe `catalogTaxonomyService` inyectado vía `AuthService.injectDependencies` desde `src/app.wiring.ts`.
- [`src/modules/services/service.service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/services/service.service.ts): Recibe `catalogTaxonomyService` inyectado vía `ServiceService.injectDependencies` desde `src/app.wiring.ts`.

## Pruebas ejecutadas
- [`tests/catalog/specialty.use-cases.unit.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/specialty.use-cases.unit.test.ts): 18 pruebas unitarias.
- [`tests/catalog/specialty.controller.unit.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/specialty.controller.unit.test.ts): 10 pruebas unitarias con inyección de dependencias pura.
- [`tests/catalog/specialty.routes.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/specialty.routes.test.ts): 6 pruebas de enrutador y middlewares.
- [`tests/catalog/transaction-context.unit.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/transaction-context.unit.test.ts): 4 pruebas de validación y rechazo explícito de contexto.
- [`tests/catalog/auth-registration-transaction.unit.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/auth-registration-transaction.unit.test.ts): 5 pruebas unitarias de coordinación transaccional y fail-fast en el registro de profesionales.
- **Total Catalog:** 43 pruebas pasando con éxito (5 archivos de prueba, 0 fallos).
- **Compilación TypeScript:** `tsc && tsc-alias` exitoso (código de salida 0).
