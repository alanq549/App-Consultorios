# Fase 4 — Plan de obra: Profiles

## Propósito

Migrar perfiles fuera del módulo legacy `users` hacia `src/modules/profiles/`, en misiones pequeñas que puedan implementarse y revisarse por separado. Este plan describe trabajo; no contiene código ejecutable.

## Estado y alcance

- Estado: **IMPLEMENTADA Y VALIDADA (2026-11-06)**.
- Misión 0: **APROBADA (2026-11-06)**; decisiones D1–D8 aprobadas en [01-DECISIONES-ARQUITECTURA.md](01-DECISIONES-ARQUITECTURA.md).
- Misiones 1–6: **IMPLEMENTADAS** bajo arquitectura limpia en `src/modules/profiles/`, controladores desacoplados y probados.
- Misión 7: **INTEGRADA** con typecheck `tsc --noEmit` aprobado en backend y frontend, y build aprobado.
- Mantener rutas, cuerpos y respuestas existentes salvo decisión aprobada.
- Separar `ClientProfile`, `ProfessionalProfile` y `AdminProfile` de `User`/Identity.
- Preservar el aislamiento tenant ya implementado en afiliaciones y directorio.
- Cambios públicos de privacidad aprobados (retiro de `verificationStatus` en directorio público) sincronizados en DTO, frontend, baseline y pruebas como migración intencional.
- Entrega privada de certificados mediante `/api/professionals/certificates/:id/download` y retiro del static path anónimo en `app.ts`.
- Contrato transaccional con Catalog (`SuspendOnSpecialtyRevokedUseCase`) para suspender el perfil en la misma unidad de trabajo al revocarse la última specialty aprobada.
- No declarar todo el backend tenant-safe al cerrar esta fase.

## Misiones

| Orden | Plano | Resultado | Estado |
|---|---|---|---|
| 0 | [Puerta de decisiones](01-PUERTA-DECISIONES.md) + [registro D1–D8](01-DECISIONES-ARQUITECTURA.md) | Aprobar ownership y límites antes de tocar comportamiento | **CERRADA** |
| 1 | [GetCurrentUser](02-GET-CURRENT-USER.md) | Componer `/api/users/me` sin hacer de Users dueño del perfil | **CERRADA** |
| 2 | [Perfil de cliente](03-PERFIL-CLIENTE.md) | Migrar lectura/actualización tipadas del cliente | **CERRADA** |
| 3 | [Perfil profesional](04-PERFIL-PROFESIONAL.md) | Separar datos propios y lecturas públicas tenant-aware | **CERRADA** |
| 4 | [Verificación profesional](05-REVISION-PROFESIONAL.md) | Migrar revisión global sin confundir afiliación o specialty | **CERRADA** |
| 5 | [Almacenamiento](06-STORAGE-AVATAR.md) | Introducir `StoragePort` y desacoplar avatar del filesystem | **CERRADA** |
| 6 | [Superficies adyacentes](07-SUPERFICIES-ADYACENTES.md) | Resolver certificados, links, admin profile y límite con Catalog | **CERRADA** |
| 7 | [Integración y cierre](08-INTEGRACION-CIERRE.md) | Retirar despacho legacy y demostrar criterios de aceptación | **CERRADA** |

## Secuencia y dependencias

La Misión 0 bloquea todas las demás. Misiones 1–6 pueden dividirse en PRs; 7 depende de todas las que se hayan aprobado para el alcance. No iniciar una misión si su contrato todavía requiere una decisión de la Misión 0 o 6.

Cada misión se revisa de forma independiente: respetar su objetivo, archivos, exclusiones, contrato previo y pruebas. Si aparece trabajo de otra fase, registrar la dependencia y no ampliarla por conveniencia.

## Transición Git

- Rama de trabajo sugerida: `feature/fase4-profiles`.
- Crear la rama desde la base que ya contenga el cierre aprobado de Fase 3 (normalmente `main` tras integrar su PR).
- Antes de cambiar, revisar `git status`; conservar los planos de Fase 4 ya creados y cualquier otro cambio local.
- Si Fase 3 todavía no está integrada a la base, integrar primero su rama o crear Fase 4 desde ella según la política del repositorio.
- El cierre documental no crea, renombra ni integra ramas; confirmar el cambio con `git branch --show-current`.

## Reglas comunes

- No duplicar `src/modules/profiles/affiliations/` ni reimplementar Slices A–H de Fase 3.
- `User`/Identity conserva credenciales; `CustomConfig` sigue en Preferences/Fase 9.
- Perfiles profesionales base y nombre/avatar son globales; bio y enlaces públicos son contenido revisado de la afiliación.
- `X-Tenant-ID` selecciona contexto público, no concede autorización.
- No agregar migraciones Prisma sin una decisión de dominio aprobada.
- Conservar errores y contratos HTTP o documentar una migración compatible y aprobada.

## Cierre de Fase 4

Solo declarar la fase cerrada cuando las misiones acordadas tengan pruebas, typecheck/build aprobados, rutas legacy verificadas y documentación actualizada. Registrar por separado deuda diferida y superficies que aún no son tenant-safe.
