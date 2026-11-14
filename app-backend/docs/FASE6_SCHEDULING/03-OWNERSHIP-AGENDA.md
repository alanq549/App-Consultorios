# Misión 2 — Aplicar ownership global de la agenda

## Objetivo

Aplicar la decisión aprobada en Fase 3 E y ratificada como D0-3: agenda compartida por `ProfessionalProfile`, visible en un tenant solo con afiliación activa.

## Archivos a crear/tocar

- Crear agregado, contratos y adapters en `src/modules/scheduling/`; adaptar `src/modules/schedule/` como capa de compatibilidad mientras haya consumidores.
- No agregar `tenantId` ni `affiliationId` a `Schedule`. Revisar índices solo si los requiere el contrato global.
- Revisar `src/modules/appointments/` para validar la agenda del mismo profesional y tenant/afiliación de la reserva.
- Revisar middleware `resolvePublicTenantMiddleware`, rutas y resolución de identidad de perfil.
- Añadir tests HTTP de creación, lectura y reserva entre dos tenants/afiliaciones.

## Reglas

- Tenant seleccionado habilita la lectura pública y la reserva según afiliación ACTIVE; no cambia ni clona la agenda.
- Cambios del horario global aplican a nuevas reservas en todas las afiliaciones y deben respetar citas existentes globalmente.
- La zona IANA es propiedad del perfil profesional (D0-1) y se gestiona solo por el flujo dedicado de Profiles D0-9; todas sus afiliaciones interpretan el horario con esa zona.
- Dos citas del mismo profesional en clínicas distintas no pueden solaparse.
- Impedir que un ID de agenda o afiliación de otro profesional/tenant habilite escritura o lectura.

## Aceptación

- La agenda permanece profile-owned y tenant-neutral en persistencia.
- Los endpoints aplican authorization y tenant resolution uniformes, sin fallback.
- Pruebas demuestran misma proyección de horario en dos afiliaciones activas, ocultamiento sin afiliación y bloqueo de solapamiento inter-clínica.
- No se crea backfill de agendas por tenant.
