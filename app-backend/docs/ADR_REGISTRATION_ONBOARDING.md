# ADR — Orquestación del registro y onboarding

## Estado

**DECIDED — arquitectura objetivo para la migración futura.**

La implementación permanece en `src/modules/auth` sin cambios hasta que se cumplan los gates de migración descritos aquí. Esta decisión no cierra la revisión de implementación de Fase 2.

## Contexto

`POST /api/auth/register` crea hoy, dentro de una transacción Prisma, `User`, un perfil de cliente o profesional, la relación inicial `ProfessionalSpecialty` cuando el rol es profesional, `CustomConfig` y `VerificationAttempt`. Después del commit intenta enviar el correo de verificación y crear una notificación de bienvenida; ambos efectos se manejan actualmente como best-effort.

Estas escrituras tienen una frontera de consistencia operacional común, pero los modelos pertenecen a conceptos distintos. Mover el método íntegro a Identity confundiría coordinación del proceso con ownership de los datos.

## Decisión

### Proceso y ubicación de la coordinación

El registro es un **proceso de onboarding cross-context**. No se asigna a Identity ni Profiles como responsabilidad exclusiva, y el proceso no constituye por sí solo un bounded context con ownership de entidades.

Cuando se migre, su caso de uso coordinador vivirá en una capa de aplicación de onboarding, propuesta como `src/modules/onboarding/application/register-user.use-case.ts`. Ese módulo será un **process coordinator**: coordina contratos de provisioning de los contextos participantes, pero no define sus modelos ni se convierte en repositorio global.

No crear el módulo ni mover el endpoint como parte de esta decisión. Hasta el hito de migración, `auth` es un adapter legacy temporal y conserva el flujo actual.

### Ownership objetivo

| Entidad | Owner conceptual | Responsabilidad |
|---|---|---|
| `User` | Identity | Cuenta, email, credenciales, rol legacy y estado de verificación. |
| `VerificationAttempt` | Identity | Emisión, expiración, consumo y persistencia del token de verificación. |
| `ClientProfile` | Profiles | Datos del perfil de cliente. |
| `ProfessionalProfile` | Profiles | Datos del perfil profesional. |
| `Specialty` | Catalog | Definición y estado del catálogo de especialidades. |
| `ProfessionalSpecialty` | Profiles | Relación de especialidad solicitada por un profesional y su lifecycle de revisión; referencia una especialidad propiedad de Catalog. |
| `CustomConfig` | Preferences | Configuración/preferencias de usuario; el alcance tenant/personal se decide en la fase correspondiente. |
| `Notification` | Notifications | Notificación persistida y su lifecycle. |

Los owners proporcionan los contratos de provisioning y son autoridad sobre sus invariantes. El coordinador recibe IDs y resultados explícitos; no comparte DTOs Prisma ni accede a servicios/repositorios internos de otros módulos.

### Límite transaccional y atomicidad

Durante la etapa de monolito modular con una sola base PostgreSQL, se preservará la atomicidad existente: las escrituras requeridas para crear la cuenta, el perfil, la relación profesional-especialidad, la configuración inicial y el intento de verificación se confirman juntas o se revierten juntas.

La transacción pertenecerá al caso de uso de onboarding y se implementará en su adapter de infraestructura mediante una única transacción de base de datos. Los adapters de provisioning de Identity, Profiles, Catalog y Preferences podrán participar en ese scope solo mediante contratos internos explícitos de persistencia. El tipo concreto de Prisma/`TransactionClient` no se expone a HTTP, dominio, casos de uso ni contratos públicos de los módulos.

Esta es una **coordinación transaccional temporal del monolito**, no una afirmación de que las entidades formen un aggregate o bounded context único. Los contratos deben mantener los invariantes de cada owner, y el adapter coordinador no debe convertirse en una capa general de queries de negocio.

Si los contextos pasan a bases de datos o servicios independientes, una transacción ACID distribuida deja de ser la estrategia. Esa migración requerirá una decisión separada sobre consistencia eventual, estados intermedios, compensaciones y mensajería/outbox; esta ADR no introduce esos mecanismos.

### Responsabilidades de Identity

Identity conserva:

- validación de credenciales y hash de contraseña;
- creación de la cuenta `User` bajo sus invariantes;
- generación y persistencia del hash, expiración y estado de `VerificationAttempt`;
- entrega del correo de verificación mediante el adapter de correo de Identity, recibiendo el token plano solo para enviar el mensaje;
- login, verificación, sesiones, reset/cambio de contraseña y cambio de email.

Identity no crea perfiles, asigna especialidades, inicializa Preferences ni escribe notificaciones. El onboarding solicita la operación de provisioning de cuenta a Identity, junto con las operaciones de provisioning de los owners restantes.

### Efectos post-commit

- El caso de uso espera a que la transacción principal confirme antes de invocar efectos externos.
- Identity envía el correo de verificación con el token generado para ese registro.
- Notifications crea la bienvenida mediante un contrato explícito de su módulo.
- El fallo de un efecto post-commit no revierte ni simula rollback de las filas confirmadas. Durante la migración sin outbox se conserva el comportamiento HTTP legacy de `201` y best-effort, con logging/observabilidad explícitos; no se reportará como transacción fallida.
- La falta de una vía pública montada para reenviar verificación es una limitación operativa conocida. La migración debe documentar cómo se recupera una entrega fallida antes de retirar `auth`; no añadirá una ruta HTTP sin aprobación.
- No introducir eventos, outbox ni reintentos automáticos en este hito. Reevaluarlos si se requiere recuperación durable o si los efectos se distribuyen entre procesos/servicios.

### Compatibilidad HTTP

`POST /api/auth/register` conserva método, URL, body discriminado por `role`, status `201` y el DTO de respuesta ya sanitizado. El controller/ruta actual puede seguir actuando como adapter de transporte y delegar al caso de uso de onboarding cuando se migre; el endpoint no migra necesariamente de namespace junto con la implementación.

El cambio interno no altera validación, mensajes/códigos de error observables ni shape del DTO, salvo correcciones de seguridad aprobadas separadamente. Se requieren pruebas de contrato antes y después de la delegación.

## Hito y precondiciones de migración

La extracción de onboarding **no es parte de Fase 2 — Identity** y no se implementa como una migración mecánica de `AuthService`. Es un hito transversal posterior, ejecutable solo cuando estén definidos:

1. el contrato mínimo de provisioning de Identity para `User` y `VerificationAttempt`;
2. el contrato de provisioning de Profiles para `ClientProfile`, `ProfessionalProfile` y `ProfessionalSpecialty`;
3. el mecanismo de validación de referencia a `Specialty` con Catalog como owner;
4. el contrato mínimo de inicialización de Preferences para `CustomConfig`;
5. el límite transaccional único y la participación explícita de los adapters sin filtrar tipos Prisma;
6. recuperación/observabilidad de fallos de correo y notificación compatibles con el contrato HTTP.

El hito se planifica después de establecer los contratos de Profiles y Catalog, y de acordar la participación mínima de Preferences. Puede ser una entrega transversal entre fases del roadmap; no requiere esperar la migración completa de Preferences ni adelantar Tenancy, si su provisioning mínimo puede definirse sin resolver decisiones tenant pendientes.

`auth` se retira únicamente cuando la ruta legacy delegue al coordinador aprobado, ningún otro consumer dependa de sus servicios/DTOs y el contrato HTTP y side effects estén cubiertos por pruebas. Hasta entonces debe permanecer identificado como temporal, no como owner conceptual permanente.

## Alternativas consideradas

### Mover `register` directamente a Identity — rechazada

Identity terminaría creando perfiles, relaciones de catálogo, Preferences y notificaciones, convirtiéndose en un módulo de onboarding accidental y acumulando ownership que no le corresponde.

### Dividir la transacción entre módulos sin coordinador — rechazada

Crearía estados parciales (por ejemplo `User` sin perfil, preferencias o token verificable), errores de compensación y cambios visibles de comportamiento. Las fronteras de bounded context no justifican perder atomicidad silenciosamente en el monolito actual.

### Eventos/outbox desde el primer paso — pospuesta

Resolvería otros problemas de entrega/reintento, pero agrega persistencia, consumidores, idempotencia, orden y observabilidad que no son necesarios para preservar el flujo transaccional actual en una sola base. Se reconsidera ante distribución real o requisito de entrega durable.

### Mantener `auth` indefinidamente — rechazada

Conserva la implementación funcional a corto plazo, pero deja el flujo cross-context sin dueño de proceso, perpetúa imports directos y difumina la diferencia entre módulo temporal y owner.

## Riesgos y controles

| Riesgo | Control/criterio |
|---|---|
| El coordinador se convierte en nuevo módulo dueño de todos los datos | Limitarlo a orquestación; mantener reglas y persistencia en adapters de cada owner. |
| Acceso cross-context debilita encapsulación | Contratos de provisioning explícitos, alcance solo para esta transacción, sin imports de servicios internos ni DTOs Prisma. |
| Desacuerdo sobre `ProfessionalSpecialty` | Adoptar Profiles como owner por su estado y revisión propios; Catalog sigue siendo owner de la especialidad referenciada. Revisar si cambian las reglas de negocio. |
| Fallo SMTP después del commit deja cuenta sin correo | Logging/alerta, recuperación documentada antes de retirar `auth`; no afirmar rollback. |
| Fallo de notificación post-commit | Mantenerlo independiente del resultado del onboarding y hacerlo observable; no introducir side effect dentro de la transacción ACID. |
| Futura separación física de contextos elimina la transacción única | Hacer una ADR nueva para consistencia eventual/saga/outbox antes de separar almacenamiento o despliegues. |
| `auth` queda temporal indefinidamente | Mantener criterios de retirada, dependencias rastreadas y un hito explícito en el roadmap. |

## Criterios de aceptación de la migración futura

- [ ] `/api/auth/register` mantiene URL, request, status y response contract.
- [ ] La unidad de escritura conserva atomicidad hasta que se apruebe explícitamente otro modelo de consistencia.
- [ ] Cada modelo se escribe a través del adapter de su owner; no hay queries de negocio globales.
- [ ] Ninguna capa HTTP/aplicación/dominio importa `Prisma.TransactionClient`.
- [ ] Identity no crea perfiles, asignaciones de catálogo, preferencias ni notificaciones.
- [ ] El token de verificación se almacena hasheado y el token plano solo se entrega al adapter de correo.
- [ ] El correo y la notificación se ejecutan post-commit y sus fallos son observables sin convertir un commit exitoso en rollback ficticio.
- [ ] Hay pruebas de rollback transaccional, provisioning por rol, especialidad inexistente/inactiva, unicidad de email, contrato HTTP y fallos de side effects.
- [ ] `auth` puede retirarse sin consumers ni comportamiento HTTP duplicado.
- [ ] No se introducen eventos/outbox o cambios Prisma como parte de la migración sin una decisión separada.
