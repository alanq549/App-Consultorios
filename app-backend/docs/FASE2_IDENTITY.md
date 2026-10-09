# Diseño técnico — Fase 2: Identity y autenticación

## 1. Estado y propósito

**Diseño:** `APPROVED` por Code Reviewer.

**Implementación:** `CLOSED / APPROVED`.

La revisión final posterior a R4 y las validaciones de cierre concluyeron satisfactoriamente: `npm test` (11 archivos, 49 tests), `npx tsc --noEmit` y `npm run build`.

Fase 1 está `CLOSED / APPROVED` en el commit `9ca3ca7`. Este documento registra el alcance y las decisiones aprobadas para la implementación de Identity/Auth. No decide Tenancy, memberships ni la semántica futura de roles, y no modifica Prisma, migraciones o contratos HTTP.

El objetivo es separar las operaciones de cuenta, credenciales y sesiones de los datos de perfiles y preferencias, manteniendo los endpoints existentes. La implementación no debe trasladar el `AuthService` entero a una carpeta nueva: primero debe separar responsabilidades y resolver los bloqueos de esta propuesta.

## 2. Evidencia del estado actual

| Evidencia | Hecho observado | Impacto para Fase 2 |
|---|---|---|
| [`auth.routes.ts`](../src/modules/auth/auth.routes.ts), [`auth.controller.ts`](../src/modules/auth/auth.controller.ts) | Publican register, login, verify, refresh, forgot-password y reset-password bajo `/api/auth`; el controller valida algunos bodies con Zod y delega a `AuthService`. | Conservar paths, métodos, request bodies y respuestas salvo el cambio de seguridad identificado abajo. |
| [`auth.service.ts`](../src/modules/auth/auth.service.ts) | Mezcla `User`, bcrypt, JWT, refresh/reset/verification tokens, `ClientProfile`, `ProfessionalProfile`, `Specialty`, `CustomConfig`, correo y `NotificationService`. | Identidad está acoplada a Profiles, Catalog, Preferences y Notifications. |
| [`auth.tokens.ts`](../src/modules/auth/auth.tokens.ts) | Firma access JWT con payload `userId` y `role`, TTL `7d`. Comprueba `JWT_SECRET` al importar el módulo y `verifyToken` retorna un cast a `JwtPayload`. | El fail-fast ya existe en este adapter; consolidar el contrato y evitar afirmar que Fase 2 lo introduce por primera vez. |
| [`auth.middleware.ts`](../src/middlewares/auth.middleware.ts) | Fase 1 verifica la estructura de claims antes de asignar el `ActorContext`; el header/errores actuales se conservan. Actualmente lee `JWT_SECRET` y verifica JWT directamente, además del módulo token. | Fase 2 debe retirar esa duplicidad: Identity será la única autoridad de configuración/verificación JWT y el middleware consumirá su resultado validado. |
| [`auth.types.ts`](../src/modules/auth/auth.types.ts) | `JwtPayload` depende de `Role` de Prisma; `AuthRequest`/`AuthUser` duplican contratos y `AuthRequest` no tiene consumidores observados. | Contrato del token pertenece a Identity; no debe duplicar el contrato transversal `ActorContext`. |
| [`users.service.ts`](../src/modules/users/users.service.ts) y [`users.controller.ts`](../src/modules/users/users.controller.ts) | Cambio de email/password vive en Users aunque opera sobre credenciales y `RefreshToken`. | Fase 2 debe trasladar la autoridad a Identity y dejar los paths actuales como adapters de compatibilidad. |
| [`auth.mail.ts`](../src/modules/auth/auth.mail.ts) | Usa Nodemailer y variables `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`, `FRONTEND_URL`; la comprobación de configuración está duplicada. | Adapter de Identity; no es una abstracción Shared Kernel ni configuración global nueva. |
| [`schema.prisma`](../prisma/schema.prisma) | `User` contiene email, hash de contraseña, `Role` global y `isVerified`; sesiones y tokens son tablas separadas ligadas a User. | Persistencia existente basta para migrar operaciones sin cambios de schema; no hay membership/tenant. |

### Hallazgo de seguridad P1 — respuesta de registro incluye el hash

`AuthService.register` retorna directamente el resultado de `tx.user.create`; `AuthController.register` serializa ese objeto completo como respuesta `201`. Prisma devuelve los escalares seleccionados por defecto, incluido `password`. Por tanto, la respuesta contiene el **hash** de contraseña, no la contraseña en texto claro.

Esto es una exposición sensible confirmada y no debe conservarse por compatibilidad. El frontend observado espera la respuesta de registro como `AuthUser` en el wrapper, pero el hook de registro descarta el body. Antes de implementar, definir el DTO público mínimo y actualizar/verificar el tipo cliente; el endpoint y el request no necesitan cambiar.

### Defecto de contrato P2 — argumentos de cambio de email invertidos

`UsersController.changeEmail` pasa `(userId, email, password)`, mientras `UsersService.changeEmail` declara `(userId, currentPassword, newEmail)`. El service compara actualmente el email nuevo con el hash de contraseña y recibe la contraseña como email a guardar. La operación no corresponde a la intención expresada por nombres/DTO. Fase 2 debe corregir el mapeo y validar la secuencia funcional con pruebas, manteniendo ruta y shape de entrada.

## 3. Responsabilidad y propiedad

### Identity (Fase 2)

- cuenta `User`: credenciales, email, estado de verificación y rol legacy actual;
- hash/verificación de contraseña;
- emisión/validación de access JWT y entrega de claims validados al middleware para construir `ActorContext`;
- sesiones/refresh tokens;
- tokens de verificación de email y restablecimiento de contraseña;
- casos de uso login, verificación, refresh, recuperación/restablecimiento, cambio de contraseña y cambio de email;
- contratos internos de entrega de correo y coordinación de onboarding que pertenezcan a la aplicación Identity.

### Autoridad JWT y creación de `ActorContext`

Identity es el único owner de la configuración JWT, incluido `JWT_SECRET`, y de la verificación/validación estructural de sus claims. El port `AccessTokenService.verify()` expone el resultado validado a los consumidores internos de Identity.

```text
Identity
├── configuración JWT (JWT_SECRET)
└── AccessTokenService.verify()
        ↓ claims verificados y validados
auth.middleware.ts
        ↓ construye el ActorContext de shared
req.user
```

Como criterio de implementación, `auth.middleware.ts` no lee `JWT_SECRET`, no importa ni llama `jwt.verify()` y consume `AccessTokenService.verify()`. El middleware solo transforma el resultado validado en el `ActorContext` de Fase 1 y lo asigna a `req.user`; `ActorContext` sigue siendo un contrato de `shared`, no una responsabilidad de autenticación compartida.

### Fuera de Identity durante esta fase

- `ClientProfile`, `ProfessionalProfile` y `AdminProfile`: Profiles, cuya migración es Fase 4;
- `Specialty` y `ProfessionalSpecialty`: Catalog/Profiles; definición de negocio sigue pendiente;
- `CustomConfig`: Preferences; alcance tenant pendiente;
- `Notification`: Notifications; mantener el servicio actual fuera de Shared;
- `Tenant`, memberships y autorización contextual: Fase 3;
- respuesta `/api/users/me`: sigue siendo una vista agregada en el adaptador actual de Users hasta su fase correspondiente.

## 4. Estructura objetivo propuesta

```text
src/modules/identity/
  http/
    identity.routes.ts            # conservar superficie HTTP /api/auth
    identity.controller.ts        # parseo request/response y delegación
  application/
    use-cases/
      login.ts
      verify-email.ts
      refresh-session.ts
      request-password-reset.ts
      reset-password.ts
      change-email.ts
      change-password.ts
    ports/
      user-account-repository.ts
      session-repository.ts
      verification-repository.ts
      password-reset-repository.ts
      password-hasher.ts
      access-token-service.ts
      mail-sender.ts
  domain/
    account.ts                     # modelo puro mínimo, si los invariantes lo justifican
    identity-errors.ts             # errores de aplicación/dominio propios de Identity
  infrastructure/
    prisma/
      prisma-*-repository.ts
    bcrypt-password-hasher.ts
    jwt-access-token-service.ts
    nodemailer-mail-sender.ts
```

No crear carpetas o entidades vacías. Si el dominio actual no requiere un objeto `Account` rico, mantener tipos de aplicación mínimos y no forzar DDD táctico. El dominio/aplicación no importa Express, Prisma, Nodemailer ni modelos de otros módulos. Los ports pertenecen a Identity y no a `shared/`.

`RegisterUser` y `welcome-notification` no forman parte de esta estructura de Fase 2: el registro queda explícitamente en el flujo legacy hasta la fase posterior aprobada.

## 5. Contratos HTTP de compatibilidad

| Método y ruta actual | Operación objetivo | Compatibilidad exigida |
|---|---|---|
| `POST /api/auth/register` | Flujo legacy; no migra a Identity en Fase 2 | Mantener body discriminado por `role` y respuesta `201`; corregir el objeto Prisma crudo por DTO explícito sin hash. |
| `POST /api/auth/login` | `Login` | Mantener email/password y response `{ token, refreshToken, user: { id, email, role, isVerified } }`; errores no deben revelar si existe el usuario. |
| `GET /api/auth/verify?token=...` | `VerifyEmail` | Mantener query y resultado con tokens/user según contrato actual. Token válido solo una vez y expirado a 10 minutos como comportamiento actual hasta nueva decisión. |
| `POST /api/auth/refresh` | `RefreshSession` | Mantener `{ refreshToken }` y `{ token, refreshToken }`; refresh token previo no puede producir más de una rotación exitosa. |
| `POST /api/auth/forgot-password` | `RequestPasswordReset` | Mantener request `{ email }` y respuesta genérica `{ message: "Si existe el usuario, se envió el correo" }`, exista o no la cuenta. Token almacenado como hash, TTL actual 15 minutos. |
| `POST /api/auth/reset-password` | `ResetPassword` | Mantener `{ token, newPassword }` y respuesta actual; invalidar el token usado y revocar sesiones conforme al comportamiento actual. |
| `PATCH /api/users/email` | `ChangeEmail` Identity, detrás del adapter existente | Mantener URL/body y exigir contraseña actual; corregir el orden actual de argumentos. Aplicar la política DECIDED de la sección 8. |
| `PATCH /api/users/password` | `ChangePassword` Identity, detrás del adapter existente | Mantener URL/body; continuar exigiendo contraseña actual y revocar refresh tokens existentes como hoy. |

`resendVerification` existe como método, pero no está montado en routes. No se añade endpoint en Fase 2 sin aprobación expresa.

La sanitización de `POST /api/auth/register` es una corrección de seguridad obligatoria de Fase 2 aunque el registro permanezca en legacy: conservar `201` y el request actual, pero devolver un DTO explícito sin password/hash ni el registro Prisma crudo.

## 6. Flujos y garantías requeridas

### Login y acceso

- No registrar password, hash, access token, refresh token ni token de operación.
- Respuestas de credenciales inválidas deben ser indistinguibles entre usuario inexistente y contraseña incorrecta.
- Mantener bloqueo de login cuando `User.isVerified` sea falso.
- Mantener el payload access actual `userId` + `role`, TTL `7d`, hasta que una decisión de compatibilidad autorice cambios.
- La creación del `ActorContext` sigue la garantía de Fase 1; Identity es autoridad de validación del JWT.

### Sesiones/refresh

- Almacenar solo hash SHA-256 del refresh token; conservar generación aleatoria de alta entropía y TTL actual de 30 días.
- Hacer revocación/rotación como una operación atómica de persistencia que garantice una sola rotación por refresh token concurrente. **Ya existe evidencia real de concurrencia:**
  ```text
  POST /api/auth/refresh
      ↓
  RefreshSessionUseCase
      ↓
  PrismaSessionRepository.rotateSession()
      ↓
  transacción
      ↓
  updateMany(isRevoked: false)
      ↓
  exactamente una rotación válida bajo concurrencia
  ```
- No agregar familia de tokens, claims de sesión ni tabla nueva sin decisión/requerimiento revisado; documentar su ausencia como límite conocido.
- Logout/revoke-all no se agrega como nuevo endpoint en esta fase salvo aprobación.

### Verificación y recuperación

- Persistir hashes de tokens de un solo uso, expiración y marca de consumo dentro de una transacción coherente.
- Corregir verificación para que no marque intentos usados fuera de la transacción que confirma `User.isVerified`.
- Reset de contraseña conserva hash bcrypt, marca token usado y revoca refresh tokens en una única transacción.
- Forgot-password devuelve una respuesta genérica tanto si la cuenta no existe como si la entrega falla para una cuenta existente; el error SMTP se captura y registra sin propagarse al HTTP para evitar revelar si la cuenta existe.
- Rate limiting para forgot/resend no se inventa en este diseño; definirlo como decisión operativa antes de exponer nuevas rutas.

### Configuración y correo

- `JWT_SECRET` ya tiene una comprobación fail-fast al importar `auth.tokens.ts`; no afirmar que Fase 2 introduce por primera vez ese comportamiento. Fase 2 debe consolidar su lectura/configuración y toda verificación de JWT bajo un único owner de Identity (`AccessTokenService`); el middleware no accede al secreto ni verifica JWT directamente. Probar ausencia/valor inválido en Identity, sin crear configuración Shared genérica.
- La verificación de configuración de correo está duplicada en `auth.mail.ts`; consolidarla en el adapter sin cambiar variables existentes.
- La configuración requerida debe validarse de forma determinista en el límite de Identity y probarse; no fallar de manera distinta según qué módulo importe primero.
- Registro permanece en legacy y conserva su manejo best-effort de correo. En Identity, forgot-password captura y registra fallos de entrega sin propagarlos al error handler HTTP para no revelar si la cuenta existe; change-email reporta el fallo después del commit. El usuario puede volver a solicitar el correo mediante el flujo existente; no se añaden reintentos automáticos, endpoint nuevo ni outbox.

## 7. Registro y coordinación con otros contextos — decisión DECIDED

`register` actualmente crea dentro de una transacción: `User`, el perfil del rol, la relación inicial `ProfessionalSpecialty` cuando aplica, `CustomConfig` y `VerificationAttempt`. Después envía email y crea welcome notification con manejo best-effort. Cortar esa transacción cambia atomicidad y onboarding.

### Decisión: register queda fuera de Identity; migración a onboarding transversal posterior

En Fase 2 no se crea `RegisterUser` ni se traslada el onboarding a Identity. `POST /api/auth/register` continúa atendido por `auth` legacy hasta un hito transversal posterior. La coordinación futura vivirá en una aplicación de onboarding, no en Identity ni en Profiles; onboarding coordina contracts de provisioning, pero no es owner de las entidades. La decisión y las precondiciones completas están en [ADR_REGISTRATION_ONBOARDING.md](ADR_REGISTRATION_ONBOARDING.md).

**Qué significa “atomicidad preservada”:** las escrituras actualmente agrupadas en una única transacción Prisma —`User`, perfil, relación inicial `ProfessionalSpecialty` cuando aplica, `CustomConfig` y `VerificationAttempt`— siguen confirmándose o revirtiéndose juntas. No se parte esa unidad en operaciones independientes ni se expone `Prisma.TransactionClient` como contrato entre bounded contexts. Email y welcome notification permanecen side effects post-commit con el comportamiento de fallo actual; no se afirma que estén cubiertos por esa transacción.

La corrección del response P1 se mantiene en el adapter legacy con un DTO serializado que excluya `password`. No se altera el handler ni la transacción en Fase 2.

La welcome notification conserva en el flujo legacy su llamada actual a `NotificationService`; no se crea un port nuevo en Identity ni se añade evento/outbox. Su migración se considera con Notifications en Fase 8.

## 8. Ownership y políticas de cuenta

### Ownership durante la transición

| Entidad/tabla | Owner definitivo | Owner temporal durante Fase 2 | Interacción permitida durante la transición |
|---|---|---|---|
| `User` | Identity | `auth` legacy hasta migrar cada caso; después use cases/adapters Identity | Identity es autoridad de credenciales, email y verificación; no ownership de perfiles. |
| `RefreshToken` | Identity | `auth` legacy; después repository Identity | Operaciones solo por casos de sesión Identity. |
| `VerificationAttempt` | Identity | `auth` legacy; después use case/repository Identity | El registro legacy puede crearla en su transacción; verify/change-email Identity puede operar mediante su adapter/repositorio. |
| `PasswordReset` | Identity | `auth` legacy; después use case/repository Identity | Lectura/escritura limitada a reset-password. |
| `ClientProfile` | Profiles | `users`/registro legacy | Identity no define ni persiste campos de perfil; register legacy mantiene provisioning actual. |
| `ProfessionalProfile` | Profiles | `users`/registro legacy | Identity no define ni persiste campos de perfil; register legacy mantiene provisioning actual. |
| `ProfessionalSpecialty` | Profiles | Registro legacy / código actual | Profiles es owner de la asignación de especialidades del profesional y su ciclo de revisión; Catalog es owner de `Specialty`. La escritura del registro legacy es provisioning temporal. |
| `CustomConfig` | Preferences | `users`/registro legacy | Identity no decide alcance tenant/personal; register legacy mantiene creación actual. |
| `Notification` | Notifications | `notifications` vía `NotificationService` actual | Si un caso Identity necesita un mensaje, interacción explícita via adapter; no importar servicio interno en el caso de uso. Register legacy conserva su llamada actual. |

**Ownership de una tabla no equivale a quién puede leerla o interactuar con ella durante la transición.** La columna temporal identifica código que mantiene operaciones legacy; no cambia el owner conceptual definitivo ni autoriza imports directos entre bounded contexts en el diseño final.

Owner conceptual no implica que Identity tenga que ser el único lector/escritor durante la transición; los adaptadores legacy pueden continuar operando temporalmente sobre las mismas tablas, siempre que esa interacción esté delimitada por el contrato de migración y no convierta al legacy en un segundo owner conceptual.

### Registro — decisión cerrada

**`DECIDED`:** register permanece legacy durante Fase 2; no crear `register-user.ts`. Se preserva exactamente la atomicidad de sus escrituras actuales y se corrige únicamente la exposición del hash mediante DTO explícito. Migrarlo requiere una decisión y fase de provisioning posterior.

### Cambio de email — política DECIDED para Fase 2

**`DECIDED`:** cambiar el email requiere contraseña actual y vuelve la cuenta no verificada hasta verificar el nuevo correo.

Flujo objetivo:

```text
PATCH /users/email
        ↓
Identity.ChangeEmail
        ↓
validar contraseña actual
        ↓
actualizar email + isVerified = false
        ↓
revocar todos los RefreshToken activos
        ↓
invalidar intentos de verificación anteriores
        ↓
crear VerificationAttempt nuevo (solo hash, TTL 10 min, un solo uso)
        ↓
enviar verification mail al nuevo email
        ↓
GET /auth/verify?token=...
        ↓
validar hash, expiración y consumo único en transacción
        ↓
User.isVerified = true + VerificationAttempt.isUsed = true
        ↓
emitir nueva sesión según el response actual de verify
```

- Las escrituras de User, revocación de refresh tokens e intento de verificación nuevo se confirman en una sola transacción; el email se envía post-commit.
- Los access JWT ya emitidos son stateless y **no se revocan inmediatamente** en este alcance; continúan válidos hasta su expiración máxima actual de 7 días. Se revocan los refresh tokens para impedir renovación. Esta limitación queda explícita; no se añadirá lookup de User por request, claim nuevo ni schema de sesión en Fase 2.
- La cuenta vuelve a estar verificada al consumir el link válido del nuevo correo. Verify emite tokens como actualmente; el cliente puede iniciar sesión normalmente desde ese punto. La política de aceptación del access token previo hasta expirar es una decisión consciente de compatibilidad, no garantía de logout inmediato.
- La creación/consumo del token es de un solo uso y aplica el TTL existente de 10 minutos. Reintentos de cambio de email deben mantener el contrato HTTP y no pueden dejar varios intentos válidos.
- Si el envío de correo falla después del commit, el cambio de email y la revocación ya ocurrieron y el endpoint reporta el fallo. El usuario puede repetir el cambio autenticado al mismo correo para invalidar el intento anterior y generar otro token. No añadir outbox/retry automático.

### Política de fallo y recuperación de correo — decisión DECIDED

- El registro sigue en el handler legacy y conserva su best-effort actual: un fallo del correo se registra, pero no revierte la cuenta ya creada.
- Forgot-password ya no propaga el fallo de entrega al error handler HTTP. Se actualizó la política para priorizar la privacidad y no revelar la existencia de la cuenta en caso de un fallo SMTP. El error es capturado y registrado de forma segura (sin incluir PII) por el caso de uso, y el controller devuelve un 200 con el mensaje genérico acordado ("Si existe el usuario, se envió el correo") tanto si la cuenta no existe como si falla el envío. Una solicitud nueva permite generar otro token.
- Change-email confirma la transacción antes del envío y propaga el fallo al cliente. Repetir el endpoint con la contraseña actual y el mismo correo invalida el intento previo y genera un token nuevo.
- No hay reintentos automáticos, outbox ni endpoint nuevo en Fase 2. El cliente recibe un error del servidor ante un fallo SMTP después de commit; el detalle interno no se expone.

### Otras decisiones todavía pendientes

| Decisión | Estado | Por qué bloquea/afecta |
|---|---|---|
| Qué ocurre con sesiones ante cambios de rol | `PENDING` para decisiones de negocio | No diseñar roles globales/tenant ni claims de membresía aquí; la política de cambio de email está decidida arriba. |
| Política de normalización/casing de email | `PENDING` | DB tiene unique sobre email, pero no se observó regla de normalización transversal. |
| Rate limiting de endpoints públicos de Identity | `PENDING` operativa | La ausencia observada no demuestra explotación; decidir política antes de hardening público. |
| Rol `ADMIN` y múltiples roles | `PENDING` de negocio, remitido a Fase 3 | Fase 2 conserva el `Role` actual; no introduce membership, permisos ni scopes. |

## 9. Archivos: mantener, migrar, adaptar y retirar

| Actual | Acción propuesta en Fase 2 | Destino/compatibilidad |
|---|---|---|
| `modules/auth/auth.routes.ts` y `auth.controller.ts` | Adaptar y mover responsabilidad HTTP gradualmente | `modules/identity/http`; conservar `/api/auth` y DTOs de transporte actuales. |
| `modules/auth/auth.service.ts` | Mantener solo el registro durante Fase 2 | No mover mecánicamente `register` a Identity; su destino es el coordinador transversal de onboarding según [ADR_REGISTRATION_ONBOARDING.md](ADR_REGISTRATION_ONBOARDING.md). |
| `modules/auth/auth.tokens.ts` | Migrar | Adapter Identity para access token; mantener claims/TTL compatibles hasta aprobar lo contrario. |
| `modules/auth/auth.types.ts` | Dividir/retirar duplicados tras migrar consumers | Payload privado Identity; `ActorContext` compartido sigue siendo contrato interno diferente. |
| `modules/auth/auth.dto.ts` | Mantener el DTO de register en su adapter actual | Conservar el contrato HTTP; el response público no incluye password hash. |
| `modules/auth/auth.mail.ts` | Adaptar como Nodemailer adapter tras `MailSender` port | Eliminar condición de config duplicada cuando se refactorice; no integrar mail en Shared. |
| `modules/users/users.controller.ts` y routes | Mantener routes como adapters; delegar email/password a Identity | No mover profile/avatar/me fuera de Users en Fase 2. |
| Métodos email/password de `UsersService` | Migrar autoridad a use cases Identity | Mantener compatibilidad HTTP; eliminar duplicación solo cuando todos los callers migren. |
| Prisma models `User`, `RefreshToken`, `VerificationAttempt`, `PasswordReset` | Mantener sin cambios de schema | Repositories de infraestructura Identity consumen instancia `shared/database`. |
| `NotificationService.notifyWelcome` | Mantener solo en registro legacy durante Fase 2 | El futuro coordinador de onboarding usa un contrato explícito de Notifications post-commit; no importar el servicio interno desde Identity. Notifications se migra en Fase 8. |
| `core/config/media.ts`, perfiles, `CustomConfig`, Specialty | No migrar en Fase 2 | Mantener sus propietarios actuales/transitorios hasta Fases 4/5/9. |

## 10. Orden recomendado de implementación

1. **Resolver gates de diseño**
   - Aprobar DTO de register sin hash y la política DECIDED de cambio de email.
   - Decidir política de entrega/fallo y recuperación de correo.
   - Confirmar contrato JWT legacy y variables requeridas.
   - No migrar los flujos bloqueados si esas decisiones siguen pendientes. Register permanece legacy por decisión.
2. **Crear el esqueleto mínimo Identity**
   - Crear solo carpetas necesarias, ports de Identity y adapters; evitar dominio artificial.
   - Criterio: aplicación/domain no importan Express, Prisma o Nodemailer.
3. **Migrar casos de sesión independientes**
   - Login, verify, refresh, forgot/reset; preservar paths y response shapes.
   - Añadir pruebas de uso único, expiración, revocación y concurrencia de refresh.
4. **Migrar cambio de contraseña/email**
   - Mantener endpoints actuales como adapters.
   - Corregir el orden de argumentos de email y aplicar la decisión aprobada de re-verificación.
5. **Mantener registro legacy y sanitizar respuesta**
   - Preservar la transacción de onboarding actual; no crear `RegisterUser` ni mover tablas de Profiles/Preferences/Catalog a Identity.
   - Corregir el DTO de respuesta para excluir hash/password y probarlo en HTTP.
6. **Diferir la extracción de onboarding**
   - No retirar `auth` ni mover register como parte de Fase 2. Seguir el hito y los gates de [ADR_REGISTRATION_ONBOARDING.md](ADR_REGISTRATION_ONBOARDING.md), después de definir contratos mínimos de provisioning de los owners participantes.
7. **Validar**
   - build/type-check;
   - tests use-case + integración de repositorios/transacciones y auth HTTP;
   - verificar que register no devuelve password/hash;
   - probar errores uniformes y que logs no contengan secretos;
   - smoke test de endpoints con DB y mail adapter sustituible.

## 11. Riesgos y criterios de aceptación para Code Review

### Riesgos

- **P1 resuelto:** register devuelve un DTO explícito sin hash ni credenciales, con prueba de integración HTTP.
- **P1 de integridad controlado:** la transacción legacy no se divide; la futura extracción de onboarding preservará atomicidad según [ADR_REGISTRATION_ONBOARDING.md](ADR_REGISTRATION_ONBOARDING.md).
- **P1 de sesión resuelto:** la rotación condicional transaccional y la prueba concurrente garantizan una sola rotación exitosa por refresh token.
- **P2 resuelto:** el mapping de argumentos de ChangeEmail está corregido y cubierto por pruebas.
- **P2 resuelto:** verify consume el intento y marca la cuenta verificada en una transacción; reset consume el token, actualiza la contraseña y revoca sesiones atómicamente.
- **P2 mitigado:** respuestas de login usan el mismo error para usuario inexistente, contraseña incorrecta y cuenta sin verificar; no se registran credenciales ni tokens.
- **P2 resuelto (R4):** el mailer fallido de forgot-password se registra sin propagar el error HTTP; cuenta inexistente y fallo SMTP obtienen el mismo `200` y mensaje genérico, verificado por prueba HTTP.
- **P2 residual de baseline, no bloqueante:** el mailer de registro legacy mantiene su guard de configuración; los mailers de Identity validan configuración requerida. La validación JWT queda centralizada en `AccessTokenService`.
- **DEFERRED:** idempotencia/retry/outbox de side effects; tenancy, membership, roles definitivos y modificación de schema.

### Criterios de aceptación

- [x] contratos HTTP existentes se conservan, excepto la redacción explícita del response de register para excluir cualquier hash/credencial;
- [x] ningún response de Identity contiene password, password hash, tokens de operación almacenados o datos Prisma accidentales;
- [x] errores de login no permiten diferenciar por respuesta la inexistencia de usuario y contraseña incorrecta;
- [x] dominio/aplicación de Identity no importan Express, Prisma ni Nodemailer;
- [x] `JWT_SECRET` tiene un único owner en Identity; el middleware usa `AccessTokenService.verify()` y no lee el secreto ni llama `jwt.verify()`;
- [x] Identity valida estructuralmente los claims antes de que el middleware construya el `ActorContext` de `shared`;
- [x] persistencia de User/sesiones/tokens se hace en adapters Identity sin cambio de schema;
- [x] refresh rotation es atómica bajo concurrencia; cada token permite como máximo una rotación exitosa;
- [x] verification/reset son one-time y sus escrituras correlacionadas son transaccionales;
- [x] cambio de email conserva URL/body, corrige el mapping y tiene política aprobada de re-verificación;
- [x] contraseña actual se exige para cambio autenticado y el cambio/reset revoca refresh tokens conforme a la política actual aprobada;
- [x] `JWT_SECRET` tiene un único owner y validación runtime en Identity; los mailers validan su configuración requerida y cuentan con pruebas; no se introduce una abstracción global en `shared`;
- [x] registro no escribe directamente perfiles, Preferences, Catalog o Notifications desde el núcleo Identity;
- [x] register permanece legacy por decisión; conserva su atomicidad actual y su response no contiene password/hash;
- [x] la futura migración de register sigue [ADR_REGISTRATION_ONBOARDING.md](ADR_REGISTRATION_ONBOARDING.md), fuera del alcance de Identity/Fase 2;
- [x] el flujo ChangeEmail aplica la política DECIDED de re-verificación, revocación de refresh y limitación explícita de access JWT stateless;
- [x] `ADMIN`/membership/tenancy no se redefinen;
- [x] no hay cambios Prisma/schema/migrations ni endpoints nuevos;
- [x] build, pruebas y smoke tests relevantes pasan.

**Fase 2 — Identity: `CLOSED / APPROVED`.** El onboarding/register sigue siendo un hito transversal posterior y se rige por [ADR_REGISTRATION_ONBOARDING.md](ADR_REGISTRATION_ONBOARDING.md).
