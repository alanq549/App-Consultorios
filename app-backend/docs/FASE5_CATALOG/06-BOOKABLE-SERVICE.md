# Misión 5 — Contrato BookableService para Appointments

## Estado

**🧩 IMPLEMENTADA — pendiente de revisión independiente — 2026-11-14.**

| Decisión de alcance | Elección |
|---|---|
| Frontera de comunicación Catalog → Appointments | **Contrato `CatalogReader`** (puerto de aplicación) + adaptador Prisma interno; Appointments no importa repositorios ni `@prisma/client` de Catalog |
| `null` como resultado uniforme | El reader devuelve `null` para servicio ausente, inactivo, de otro profesional, especialidad desactivada o fila legacy sin afiliación; el HTTP responde 404 sin revelar existencia |
| Propagación del lock D5 | La firma pública son 3 argumentos; un 4.º opcional `tx` permite que Appointments lea dentro de la misma transacción en la que ya tomó el lock de fila |

## Objetivo

Dar a Appointments una lectura tipada y tenant-aware de servicios reservables sin importar infraestructura Prisma de Catalog.

## Archivos a crear/tocar

- Definir `CatalogReader` y `BookableService` como contrato estable, con identificadores de servicio, profesional y tenant/afiliación verificados, nombre, duración, precio y moneda aprobados en D0.
- Mantener la firma requerida por Appointments:
  ```ts
  getBookableService(serviceId: number, professionalId: number, tenantId: number): Promise<BookableService | null>
  ```
- Implementar adapter Prisma en Catalog; convertir Decimal a transporte exacto definido, sin coerciones de `number` no aprobadas.
- Inyectar reader en composición y usarlo desde `src/modules/appointments/appointments.service.ts` para create, guest create y availability.
- Retirar `getServiceById` y las consultas directas a `prisma.service` de Appointments.
- Tests de contrato/adapter y HTTP de acceso cruzado/reservabilidad.

## Límites

- Reader devuelve `null` para servicio ausente, inactivo, de otro profesional o no reservable en tenant seleccionado.
- `X-Tenant-ID` no autoriza; validar afiliación/oferta activa según modelo D0.
- Appointments no recibe objeto Prisma ni abre consultas a tablas del catálogo.
- Snapshots históricos completos permanecen en Fase 7; Fase 5 respeta la regla temporal de cambios aprobada en D0.

## Aceptación

- Tests demuestran tenant A no puede reservar el servicio de B, incluidos guest y disponibilidad.
- Duración/precio provienen del contrato de Catalog usado en reserva.
- Contrato permite cambiar infraestructura sin cambiar Appointments.
- Sin imports `@prisma/client`/repositorio de Catalog desde Appointments.

## Evidencia de Implementación

### 1. Contrato — [`catalog-reader.port.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/ports/catalog-reader.port.ts)

- Interfaz `CatalogReader.getBookableService(serviceId, professionalId, tenantId, tx?)` → `Promise<BookableService | null>` en `src/modules/catalog/application/ports/`.
- Proyección `BookableService` sin detalles de persistencia: `id`, `professionalProfileId`, `affiliationId`, `name`, `description`, `durationMin`, `price`, `currency`, `specialtyId`.
- **D7**: `price: string` (decimal de 2 posiciones) y `currency: typeof BOOKABLE_SERVICE_CURRENCY`; `BOOKABLE_SERVICE_CURRENCY = "MXN" as const`.
- El 4.º parámetro `tx?: TransactionContext` es opcional: la firma requerida por Appointments son los 3 primeros argumentos; cuando Appointments ya sostiene el lock D5 propaga su transacción.

### 2. Adaptador — [`prisma-catalog-reader.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/prisma/prisma-catalog-reader.ts)

- `PrismaCatalogReader` resuelve la reservabilidad en **una sola consulta** `findFirst` filtrando por `id`, `profileId`, `isActive: true`, `affiliation: { tenantId, status: "ACTIVE", professionalProfileId }` (D3) y `specialty: { isActive: true }` (D6).
- Devuelve `null` si la oferta no existe, es de otro profesional, está inactiva, su especialidad está desactivada, la afiliación no es ACTIVE en el tenant, o la fila es legacy (`affiliationId === null`, D8).
- **D7**: serializa el `Decimal(10,2)` con `ServiceOffer.formatPrice(price.toString())` → string exacto de 2 posiciones, sin coerción a `number` de punto flotante.

### 3. Frontera pública y ensamblado

- [`catalog/index.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/index.ts): exporta `BOOKABLE_SERVICE_CURRENCY` y los tipos `CatalogReader`/`BookableService`. No exporta el adaptador Prisma.
- [`catalog.wiring.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/catalog.wiring.ts): instancia `PrismaCatalogReader` y lo expone como `catalogReader` en el objeto de composición.
- [`app.wiring.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/app.wiring.ts#L123-L127): inyecta `catalogContainer.catalogReader` en `AppointmentService` mediante `AppointmentService.injectDependencies(...)`.

### 4. Consumo en Appointments — [`appointments.service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/appointments/appointments.service.ts)

- Inyección estática `injectDependencies({ catalogReader })` + getter `getCatalogReader()` que lanza si no se inyectó (mismo patrón que `AuthService`).
- `create`, `createGuest` y `getAvailability` resuelven la oferta con `catalogReader.getBookableService(...)`. `create`/`createGuest` leen **dentro** de la transacción (tras `lockServiceRowForUpdate`) propagando `tx`; devuelven `null` → 404 uniforme si no es reservable. `getAvailability` usa `service.durationMin`.
- **Se eliminó** el helper `getServiceById`, el import de `Prisma`/`PrismaActiveAffiliationChecker` y todo acceso directo a `prisma.service` desde Appointments.
- **La respuesta de reserva se arma desde el contrato**: `create`/`createGuest` ya **no** incluyen la relación Prisma `service`, y su bloque `service` (id, nombre, descripción, `durationMin`, precio) se construye con el snapshot `BookableService`. `mapToDTO` acepta ese snapshot como 3.er parámetro; los flujos de lectura histórica (`updateStatusByProfessional`, `getUpcoming`, `getMyAppointments`) lo omiten y derivan el bloque del `service` incluido.

### 5. Aislamiento por oferta (D3) en HTTP

- [`tests/appointments/appointments-tenancy.http.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/appointments/appointments-tenancy.http.test.ts): se siembran ofertas con `affiliationId` y un profesional **dual** (afiliado a los tenants A y B) cuya oferta pertenece a la afiliación de A. Se verifica que reservar esa oferta desde el tenant B responde 404 y desde el tenant propietario (A) responde 201.

### 6. Precio por contrato y desacople de la relación Prisma — hallazgo P2 (2026-11-14)

Revisión: `create`/`createGuest` usaban `BookableService.durationMin` pero **no** su `price`; la respuesta seguía cargando `appointment.service` y convertía el precio con `Number(...)`, dejando sin efecto el decimal exacto del contrato (D7) y manteniendo el acoplamiento a la relación Prisma del catálogo. No coincidía con el criterio de que duración **y precio** provengan del contrato.

**Resolución.**

- **Precio del contrato**: `create`/`createGuest` toman el bloque `service` de la respuesta desde el `BookableService` resuelto por `CatalogReader` (precio ya formateado a string de 2 posiciones), y **eliminan** `service: true` del `include` de Prisma, de modo que el flujo de reserva no depende de `appointment.service`.
- **D7 en todo el DTO**: [`appointments.dto.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/appointments/appointments.dto.ts) declara `AppointmentResponseDTO.service.price` como `string` (2 posiciones), coherente con `ServiceOfferResponseDTO`. Los flujos de lectura histórica formatean el `Decimal(10,2)` con `toFixed(2)`; ninguno emite `number`. Es un **cambio de tipo en el contrato HTTP** de citas (antes `number`), alineado con D7.
- **Cobertura**: la semilla de [`appointments-tenancy.http.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/appointments/appointments-tenancy.http.test.ts) usa un precio no entero (`250.5`) y se verifica que la reserva autenticada y la de invitado devuelven `service.price === "250.50"` (string), además de `id` y `durationMin` del contrato.

## Pruebas ejecutadas

| Archivo | Pruebas |
|---|---|
| [`tests/catalog/catalog-reader.contract.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/catalog-reader.contract.test.ts) | 6 (contrato del adaptador contra PostgreSQL: proyección con `price: "250.50"` y `currency: "MXN"`; `null` cuando el tenant no corresponde; oferta inactiva; especialidad desactivada D6; fila legacy sin afiliación D8; oferta de otro profesional) |
| [`tests/appointments/appointments-tenancy.http.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/appointments/appointments-tenancy.http.test.ts) | 18 (incluye aislamiento por oferta D3 —tenant B con la oferta de la afiliación A → 404, tenant propietario → 201— y la verificación D7 de que la reserva autenticada y la de invitado devuelven el bloque `service` del contrato con `price: "250.50"` como string) |
| [`tests/catalog/service-offer-concurrency.integration.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/service-offer-concurrency.integration.test.ts) | 2 (**actualizado**: se inyecta el `CatalogReader` en el test para que la reserva D5 siga ejerciendo el lock real; ambas carreras vuelven a pasar) |

Comandos de validación:

```powershell
npx tsc --noEmit
npx vitest run tests/catalog/catalog-reader.contract.test.ts
npx vitest run tests/appointments/appointments-tenancy.http.test.ts
npx vitest run tests/catalog/service-offer-concurrency.integration.test.ts
npx vitest run
```

Resultados:

- `npx tsc --noEmit` → **exit 0**.
- `tests/catalog/catalog-reader.contract.test.ts` → **6 passed**.
- `tests/appointments/appointments-tenancy.http.test.ts` → **18 passed**.
- `tests/catalog/service-offer-concurrency.integration.test.ts` → **2 passed** (integración PostgreSQL real).
- Suite completa → **67 archivos, 560 tests passed**.

## Aceptación (verificación)

- [x] Tests demuestran que el tenant A no puede reservar el servicio del tenant B, incluidos guest y disponibilidad (la lectura cruza `affiliation.tenantId` + `status: "ACTIVE"` + `professionalProfileId`).
- [x] Duración **y precio** provienen del contrato de Catalog (`BookableService`) usado en la reserva; el bloque `service` de `create`/`createGuest` no carga la relación Prisma y el precio se expone como string decimal exacto (D7).
- [x] El contrato permite cambiar la infraestructura de Catalog sin tocar Appointments (sólo depende del puerto `CatalogReader`).
- [x] Sin imports de `@prisma/client`, `prisma.service` ni repositorios de Catalog desde [`appointments.service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/appointments/appointments.service.ts).

## Veredicto de revisión

**✅ APROBADA — 2026-11-14.** La corrección del hallazgo P2 quedó resuelta en backend (las respuestas de reserva usan el snapshot de `CatalogReader` y preservan el precio como string decimal). Se coordinó el contrato con el frontend actualizando [`appointments.types.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-consultorio/src/types/appointments.types.ts#L39) (`AppointmentResponseDTO.service.price`: `number` → `string`), sin usos numéricos previos del precio de una cita. Typecheck del frontend (`tsc -p tsconfig.app.json --noEmit`) → exit 0.

