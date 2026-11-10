# Misión 5 — Contrato BookableService para Appointments

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
