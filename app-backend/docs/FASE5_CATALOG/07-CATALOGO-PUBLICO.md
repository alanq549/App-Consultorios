# Misión 6 — Proyecciones públicas del catálogo

## Estado

**🧩 IMPLEMENTADA — pendiente de revisión independiente — 2026-11-14.**

| Decisión de alcance | Elección |
|---|---|
| Alcance del listado global de taxonomía | `GET /api/specialties` es público y **sin** selector de tenant; devuelve sólo especialidades **activas** con DTO explícito |
| Vista pública tenant-scoped | `GET /api/services/professional/:profileId` y `GET /api/specialties/professional/:profileId` exigen `X-Tenant-ID`; el alcance se deriva de la afiliación **ACTIVE** (D3) |
| Recurso ajeno/inactivo | 404 uniforme (`null`) sin revelar existencia, reutilizando el contrato de Fase 3 |
| Compatibilidad de rutas | Rutas preservadas; cambio **intencional** de shape (se recortan campos internos/administrativos) |

## Objetivo

Publicar Specialty/ofertas mediante DTOs explícitos y tenant-scoped, manteniendo rutas compatibles o documentando una migración.

## Archivos a crear/tocar

- Crear mappers y DTOs de lectura pública bajo `src/modules/catalog/`.
- Adaptar endpoints actuales `/api/services/professional/:profileId`, `/api/specialties/` y `/api/specialties/professional/:profileId`.
- Revisar usos de `ServiceService.findByProfessional` y `SpecialtyService.listByProfessional`; evitar exponer todas las elegibilidades en cada tenant.
- Reusar middleware `resolvePublicTenantMiddleware` y afiliación activa existente; extender con la oferta aprobada, no duplicar resolución.
- Actualizar frontend consumidor si cambia shape y documentar contrato en baseline.
- Tests HTTP para tenant, afiliación, estado oferta, specialty y privacidad.

## Límites

- Listado global de taxonomy solo incluye especialidades activas.
- Vista pública tenant solo incluye ofertas activas y elegibles de la afiliación elegida.
- Ocultar recurso ajeno/inactivo con respuesta uniforme según contrato actual.
- No devolver status administrativo de elegibilidad, datos privados, Prisma Decimal ni perfil completo.

## Aceptación

- Ninguna oferta de otra afiliación aparece en lectura pública.
- Tenant inválido/ausente mantiene 400/404 aprobado; sin selector no hay fallback.
- DTO explícito probado y compatible con consumidores actualizados.
- Pruebas de Fase 3 de catálogo siguen pasando sin relajar aislamiento.

## Evidencia de Implementación

### 1. DTOs explícitos — [`public-catalog.dto.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/dto/public-catalog.dto.ts)

- `PublicSpecialtyDTO` → `{ id, name, description }` (taxonomía global activa).
- `ProfessionalPublicSpecialtyDTO` → `{ specialtyId, name, description, specialty: { id, name, description } }`; **sin** `status` de elegibilidad.
- `PublicServiceOfferDTO` → `{ id, name, description, durationMin, price, specialtyId, specialty? }`; **sin** `isActive`, `profileId`, `affiliationId`, `createdAt`, `updatedAt`.
- `toPublicServiceOfferDTO` formatea el precio con `ServiceOffer.formatPrice` → string decimal de 2 posiciones (D7), nunca `number`.
- Sustituye y elimina [`professional-public-specialty.dto.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/dto/public-catalog.dto.ts) (el mapeo inline pasó a un mapper explícito).

### 2. Casos de uso reorientados a proyección pública

- [`list-active-specialties.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/list-active-specialties.use-case.ts): `SpecialtyResponseDTO[]` → `PublicSpecialtyDTO[]` (sólo activas).
- [`list-professional-public-offers.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/list-professional-public-offers.use-case.ts): deriva `affiliationId` con `ActiveAffiliationCheckerPort`; si no hay afiliación ACTIVE devuelve `null` (404); lista sólo ofertas **activas** vía `listActiveByAffiliation`.
- [`list-professional-public-specialties.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/list-professional-public-specialties.use-case.ts): `null` si no hay afiliación ACTIVE; la consulta filtra `status: "APPROVED"` ∧ `specialty.isActive: true`.

### 3. Endpoints y middleware

- `GET /api/services/professional/:profileId` y `GET /api/specialties/professional/:profileId` usan `resolvePublicTenantMiddleware()` (`X-Tenant-ID`); 404 uniforme si el recurso es ajeno o la afiliación no está ACTIVE.
- `GET /api/specialties` es público **sin** selector de tenant y devuelve sólo especialidades activas.
- Se reutiliza el middleware de Fase 3 (`resolvePublicTenantMiddleware`), sin duplicar la resolución de tenant ni la afiliación activa.

### 4. Cambio de contrato (compatibilidad)

| Endpoint (GET) | Antes | Después |
|---|---|---|
| `/api/specialties` | `SpecialtyResponseDTO` (`…, isActive, createdAt, updatedAt`) | `PublicSpecialtyDTO` (`id, name, description`) |
| `/api/services/professional/:profileId` | `ServiceOfferResponseDTO` (incluía `isActive`, `profileId`, `affiliationId`, `createdAt`, `updatedAt`; todas las ofertas) | `PublicServiceOfferDTO` (precio string; **sólo activas**) |
| `/api/specialties/professional/:profileId` | DTO con mapeo inline | `ProfessionalPublicSpecialtyDTO` (sin `status`) |

Las rutas y el selector se preservan; el recorte de campos es **intencional** para no exponer estados administrativos, datos privados ni columnas de persistencia.

### 5. Consumidor frontend

- Nuevo consumidor [`app-consultorio/src/features/discovery/`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-consultorio/src/features/discovery/api/discovery.api.ts) que consume `/specialties`, `/specialties/professional/:id` y `/services/professional/:id`, mapeando el precio string a `price` (number) + `priceFormatted`.
- Corrección: [`catalog.mapper.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-consultorio/src/features/discovery/mappers/catalog.mapper.ts#L2) usa `import type` (requerido por `verbatimModuleSyntax`).
- **Pendiente (frontend, fuera del alcance backend)**: los consumidores legacy [`service.api.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-consultorio/src/api/service.api.ts) y [`specialty.api.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-consultorio/src/api/specialty.api.ts) tipan contra `Service`/`Specialty` con campos que el DTO público ya no envía (`isActive`, `createdAt`, `specialty` completo, `status`); no rompen el typecheck (cast sobre `any`) pero su UI debe alinearse.

## Pruebas ejecutadas

| Archivo | Pruebas |
|---|---|
| [`tests/catalog/public-catalog.http.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/public-catalog.http.test.ts) | 6 (**nuevo**; privacidad del DTO, sólo oferta activa, precio `"250.50"`, taxonomía sólo activa, proyección sin `status`, 400 sin selector) |
| [`tests/catalog/public-catalog-projection.integration.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/public-catalog-projection.integration.test.ts) | 3 (aislamiento por tenant y formato DTO en los casos de uso) |
| [`tests/services/catalog-tenancy.http.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/services/catalog-tenancy.http.test.ts) | 9 (Fase 3: aislamiento por tenant, selector, tenant inexistente/inactivo, afiliación suspendida) |

Comandos de validación:

```powershell
npx tsc --noEmit
npx vitest run tests/catalog/public-catalog.http.test.ts
npx vitest run
```

Resultados:

- `npx tsc --noEmit` → **exit 0**.
- `tests/catalog/public-catalog.http.test.ts` → **6 passed**.
- Suite completa → **69 archivos, 569 tests passed** (integración PostgreSQL real).
- Frontend: `npx tsc -p tsconfig.app.json --noEmit` → **exit 0** (tras corregir el import type-only).

## Aceptación (verificación)

- [x] Ninguna oferta de otra afiliación aparece en lectura pública (el alcance se deriva de la afiliación ACTIVE del tenant; 404 uniforme).
- [x] Tenant inválido/ausente mantiene 400/404; sin selector → 400, sin fallback.
- [x] DTO explícito probado (HTTP + integración) y consumidor frontend alineado (`features/discovery/`).
- [x] Pruebas de Fase 3 de catálogo siguen pasando sin relajar aislamiento (`catalog-tenancy.http.test.ts` 9/9).
