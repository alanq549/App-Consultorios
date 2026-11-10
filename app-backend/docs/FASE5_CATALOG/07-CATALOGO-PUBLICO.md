# Misión 6 — Proyecciones públicas del catálogo

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
