# Misión 2 — Migrar elegibilidad ProfessionalSpecialty

## Objetivo

Consolidar solicitudes y revisión global de `ProfessionalSpecialty` en Catalog, sin confundir elegibilidad con oferta ni afiliación.

## Por qué

La lógica vive en `src/modules/specialty/ProfessionalSpecialty/`, dispara notificaciones dentro/fuera de transacción y puede cambiar el estado global del perfil.

## Archivos a crear/tocar

- Crear casos de uso/repositorios Catalog para solicitar y revisar elegibilidad.
- Migrar los controllers, services y rutas activos de `src/modules/specialty/ProfessionalSpecialty/`, conservando contrato mientras se verifica consumidor.
- Usar el contrato aprobado `src/modules/profiles/application/use-cases/suspend-on-specialty-revoked.use-case.ts` al revocar la última elegibilidad APPROVED.
- Compartir con Profiles la misma unidad de trabajo/cliente transaccional; propagar fallo para rollback de ambas escrituras.
- Reemplazar consultas directas de `ProfessionalSpecialty` en Profiles/Auth por contrato autorizado cuando aplique.
- Añadir tests de límites, estados, autorización, concurrencia, rollback y notificaciones.

## Límites

- `ProfessionalSpecialty` es global; no recibe `tenantId`.
- ADMIN global revisa; OWNER tenant no aprueba elegibilidad global.
- Aprobación no crea afiliación ni oferta reservable.
- Respetar reglas aprobadas en Fase 4: solo perfiles APPROVED sin specialties aprobadas pasan a SUSPENDED; estado PENDING/REJECTED no se altera.
- Notificación no determina commit de elegibilidad; definir/reusar política explícita y no emitir éxito falso.

## Aceptación

- Última specialty revocada suspende perfil con el contrato transaccional compartido.
- Fallo de suspensión revierte la revisión; concurrencia no deja perfil publicable sin elegibilidad.
- Rutas y respuestas legacy probadas; no quedan controllers duplicados activos.
