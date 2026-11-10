# Fase 5 — Registro de decisiones de Catalog (Misión 0)

## Estado

**READY FOR REVIEW — 2026-11-10.** Propuesta arquitectónica sometida a la revisión de código independiente antes de modificar código fuente, esquemas Prisma o datos persistidos. Define los límites, ownership, autorización y contratos de integración para las Misiones 1 a 7 de la Fase 5.

---

## Principios Rectores y Separación de Fronteras

1. **Taxonomía médica (`Specialty`):** Catálogo global de la plataforma, único, no duplicado por tenant, administrado exclusivamente por `ADMIN` de plataforma.
2. **Elegibilidad clínica (`ProfessionalSpecialty`):** Acreditación/competencia global del profesional. No pertenece a un tenant ni representa por sí misma una oferta comercial. Administrada por `ADMIN` y solicitada por el profesional.
3. **Oferta clínica reservable (`Service`):** Pertenece estrictamente a una afiliación profesional con una clínica/tenant (`ProfessionalTenantAffiliation`). Precio, duración y disponibilidad son configurables independientemente por tenant y nunca se heredan automáticamente entre distintas afiliaciones del mismo profesional.
4. **Coordinación transaccional trans-módulo (Profiles–Catalog):** Se mantiene el invariante de Fase 4: Catalog es dueño de la transacción exterior y al revocar la última especialidad aprobada invoca síncronamente `SuspendOnSpecialtyRevokedUseCase` bajo row lock (`FOR UPDATE`); si la suspensión falla, toda la transacción de Catalog revierte.
5. **Seguridad y Tenancy:** `X-Tenant-ID` selecciona el contexto público de la clínica; no otorga privilegios ni crea relaciones. Ninguna oferta reservable puede existir sin una afiliación activa verificada en base de datos.
6. **Integridad de citas:** Ninguna oferta con citas futuras pendientes puede desactivarse o alterar destructivamente sus términos de reserva.

---

## Las Ocho Decisiones de Dominio (D1 – D8)

---

### D1 — Taxonomía: `Specialty` Global de Plataforma

* **Owner / Scope:** `Catalog` (`src/modules/catalog/`). Catálogo global único de especialidades médicas (ej. "Cardiología", "Pediatría", "Dermatología"). No se particiona ni se duplica por tenant.
* **Actor autorizado / Modificación:**
  * **Exclusivo `ADMIN` de plataforma:** Crear (`POST /api/specialties`), editar (`PATCH /api/specialties/:id`), desactivar mediante soft-delete (`DELETE /api/specialties/:id`), y restaurar (`PATCH /api/specialties/:id/restore`).
  * Ni el profesional ni el `OWNER` de un consultorio/tenant tienen permisos para crear o modificar especialidades taxonómicas globales.
* **Visibilidad / Rutas:**
  * `GET /api/specialties`: Retorna únicamente especialidades activas (`isActive: true`), ordenadas alfabéticamente por nombre, accesible públicamente para consulta general y para que los profesionales seleccionen qué especialidad solicitar.
  * `GET /api/specialties/inactive` (o filtro admin): Accesible solo por `ADMIN` para auditoría y reactivación.
* **Invariantes:**
  * `Specialty.name` es único a nivel global (`@unique`).
  * Desactivar una especialidad establece `isActive = false` (soft-delete); nunca se eliminan físicamente filas para proteger la integridad histórica de auditoría y relaciones existentes.

---

### D2 — Elegibilidad: `ProfessionalSpecialty` Global

* **Owner / Scope:** `Catalog` (`src/modules/catalog/domain/eligibility/`). Modela la habilitación o acreditación profesional para ejercer una especialidad médica determinada. Es una relación global entre `ProfessionalProfile` y `Specialty`; no pertenece a ninguna clínica en particular.
* **Ciclo de vida y actores autorizados:**
  * `PENDING`: Creada por el profesional mediante `POST /api/professionals/specialties/:specialtyId`.
    * *Invariante de cuota:* Máximo 2 solicitudes en estado `PENDING` simultáneas por profesional.
    * *Invariante de unicidad:* Un profesional no puede volver a solicitar una especialidad si ya existe una relación previa en cualquier estado (`PENDING`, `APPROVED`, `REJECTED`).
  * `APPROVED`: Aprobada únicamente por `ADMIN` de plataforma mediante `PATCH /api/admin/:professionalId/specialties/:specialtyId/status`. Habilita al profesional para ofertar servicios de esa especialidad. No crea automáticamente ofertas ni afiliaciones.
  * `REJECTED`: Rechazada por `ADMIN` de plataforma. Estado terminal de la solicitud.
* **Coordinación transaccional con Profiles (D5 de Fase 4):**
  * Catalog ejecuta la revisión dentro de `prisma.$transaction(async (tx) => ...)`.
  * Si el nuevo estado es `REJECTED` (o se revoca una aprobada), Catalog invoca síncronamente `SuspendOnSpecialtyRevokedUseCase.execute(professionalId, tx)`.
  * Si el profesional queda con 0 especialidades aprobadas:
    * Si el perfil estaba `APPROVED`, Profiles lo transiciona a `SUSPENDED` bajo row-level locking (`FOR UPDATE`).
    * Si el perfil estaba `PENDING` o `REJECTED`, su estado se preserva intacto.
  * Si la suspensión falla o la base arroja un error de concurrencia, la excepción se propaga y la transacción exterior revierte atómicamente la mutación de la especialidad.
* **Notificaciones:** Se ejecutan en modo *best-effort* post-commit (fuera de la transacción). Un fallo en el envío de correo no revierte la operación confirmada, pero se registra de forma observable (`console.error`).

---

### D3 — Oferta de Servicio: Alcance por Afiliación (`TenantAffiliationOffer`)

* **Owner / Scope:** `Catalog` (`src/modules/catalog/domain/offer/`). Modela el servicio clínico comercial que un profesional ofrece a los pacientes dentro de una clínica específica.
* **Problema legacy:** El modelo `Service` actual contiene `profileId` y `specialtyId`, pero carece de `affiliationId` o `tenantId`, e impone la restricción `@@unique([profileId, name])`. Esto impide que un mismo profesional ofrezca "Consulta General" en dos clínicas distintas con precios y duraciones diferentes.
* **Vínculo canónico acordado:**
  * **Relación canónica obligatoria:** La oferta se vincula directamente a `ProfessionalTenantAffiliation` mediante la clave foránea `affiliationId: Int` (`references: [id]`).
  * **Garantía relacional:** Dado que `ProfessionalTenantAffiliation` ya posee la restricción de integridad `@@unique([professionalProfileId, tenantId])` (`schema.prisma:137`), vincular el servicio a `affiliationId` garantiza formalmente la correspondencia unívoca e inmutable entre el profesional y el tenant sin riesgo de discrepancias entre pares sueltos de IDs.
  * **Unicidad del servicio:** Se sustituye la restricción legacy `@@unique([profileId, name])` por `@@unique([affiliationId, name])`. Esto permite que un profesional pueda ofrecer un servicio con el mismo nombre (ej. "Consulta General") en diferentes consultorios con términos comerciales independientes.
  * **Autonomía por clínica:** Precio, duración y disponibilidad pertenecen exclusivamente a esa afiliación. Una oferta creada en una afiliación jamás se replica, hereda ni expone automáticamente a otras clínicas del mismo profesional.
  * **Transición de Schema:** En Misión 3 se planificará la migración del modelo `Service` agregando `affiliationId` (relación a `ProfessionalTenantAffiliation`), ajustando los índices correspondientes (`@@index([affiliationId, specialtyId])`, `@@index([isActive])`), y deprecando `profileId` directo.

---

### D4 — Acceso de Escritura y Autorización sobre Ofertas

* **Owner / Scope:** `Catalog` / Casos de uso de gestión de servicios.
* **Actor autorizado:** El profesional titular de la afiliación (con rol `PROFESSIONAL`).
* **Reglas de autorización estrictas:**
  Para crear (`CreateService`), modificar (`UpdateService`) o desactivar (`DeactivateService`) una oferta en un tenant:
  1. El actor debe estar autenticado y su token debe corresponder a un usuario con rol `PROFESSIONAL`.
  2. El perfil profesional debe estar en estado `verificationStatus === 'APPROVED'`.
  3. El profesional debe tener una afiliación activa (`status === 'ACTIVE'`) en el tenant objetivo.
  4. La membresía del usuario en el tenant (`TenantMembership`) debe estar en estado `ACTIVE`.
  5. La especialidad médica vinculada a la oferta debe estar globalmente aprobada para ese profesional (`ProfessionalSpecialty.status === 'APPROVED'`).
  6. Si alguna de estas condiciones no se cumple, la operación es denegada con `403 Forbidden` (`UnauthorizedAffiliationActionError` o `InvalidProfileStatusTransitionError`).

---

### D5 — Cambios y Desactivación ante Citas: Política de Inmutabilidad Absoluta Pre-Snapshots

* **Owner / Scope:** Coordinación `Catalog` – `Appointments`.
* **Hecho técnico:** En el estado actual, el modelo `Appointment` solo almacena `serviceId` y horarios; sus DTOs leen dinámicamente `price` y `durationMin` directamente de la fila `Service` actual (`appointments.service.ts`), tanto para citas futuras como para citas históricas (pasadas, atendidas o canceladas). Hasta que la **Fase 7** introduzca snapshots inmutables persistidos en `Appointment`, cualquier mutación sobre los términos de un `Service` alteraría retroactivamente los recibos y registros de todas las citas ya existentes en el sistema.
* **Decisión de inmutabilidad contractual estricta (Fase 5):**
  * **Modificación de términos contractuales (`durationMin`, `price`, `specialtyId`):**
    * **Bloqueo si existen citas asociadas:** Si un servicio tiene **cualquier cita asociada** (pasada, presente o futura; es decir `appointment.count({ where: { serviceId } }) > 0`), **se bloquea terminantemente toda modificación de `price`, `durationMin` o `specialtyId`** con error de dominio `ServiceImmutableTermsWithAppointmentsError` (HTTP 400).
    * **Modificaciones permitidas:** Si el servicio ya tiene citas, el profesional únicamente puede modificar campos meramente descriptivos e informativos que no alteran el contrato de reserva ni de cobro (`description`).
  * **Estrategia para actualizar términos comerciales:**
    * Si el profesional desea actualizar el precio o la duración de un servicio que ya cuenta con citas en su historial:
      1. Crea una **nueva oferta** (ej. "Consulta General 2026") bajo su misma afiliación con el nuevo precio y duración.
      2. Las nuevas reservas se agendan exclusivamente contra la nueva oferta.
      3. La oferta anterior permanece activa mientras tenga citas futuras pendientes; una vez que todas sus citas pendientes concluyan o se cancelen, el profesional puede proceder a desactivarla (`isActive = false`).
  * **Desactivación de oferta (`isActive = false`):**
    * **Normalización canónica de `Appointment.date` en UTC:**
      * En el backend, `Appointment.date` almacena la fecha calendario. Para evitar discrepancias por zonas horarias del servidor (como la observada históricamente entre el flujo regular local `T00:00:00` y el flujo de invitado `T00:00:00Z`), se fija como estándar obligatorio que `Appointment.date` representa estrictamente la **medianoche en UTC (`T00:00:00.000Z`)**.
      * Las operaciones temporales combinan unívocamente la fecha y los minutos en UTC mediante la función canónica de ciclo de vida (`src/modules/appointments/appointment-lifecycle.ts:13-25`):
        ```ts
        function buildUTCDate(baseDate: Date, minutes: number): Date {
          return new Date(Date.UTC(
            baseDate.getUTCFullYear(),
            baseDate.getUTCMonth(),
            baseDate.getUTCDate(),
            0,
            minutes,
            0,
            0
          ));
        }
        ```
    * **Definición canónica de citas impeditivas (futuras y en curso):**
      * El límite contractual de una cita es su instante de finalización:
        `endDateTime = buildUTCDate(appointment.date, appointment.endMin)`
      * Se define que una cita **impide la desactivación** si cumple copulativamente:
        1. Su estado operativo es no terminal: `status IN ('PENDING', 'CONFIRMED')`.
        2. Su instante de finalización es posterior al momento de verificación: `endDateTime.getTime() > now.getTime()`.
        *(Esto abarca de forma exacta tanto las citas futuras `startDateTime > now` como las citas activas actualmente en curso `startDateTime <= now < endDateTime`).*
    * **Regla de bloqueo:** Si existe al menos una cita futura o en curso vinculada a la oferta (`status IN ('PENDING', 'CONFIRMED')` y `endDateTime > now`), la desactivación es **rechazada de inmediato** con error de dominio `ServiceHasPendingAppointmentsError` (HTTP 400).
    * **Desactivación permitida:** Si el servicio únicamente tiene citas con estados terminales (`CANCELLED`, `COMPLETED`) o citas cuyo instante de finalización ya concluyó en el pasado (`endDateTime.getTime() <= now.getTime()`), la desactivación se permite mediante soft-delete (`isActive = false`). El servicio queda excluido del catálogo reservable, pero su registro se conserva íntegro en base de datos para que el historial médico y de facturación siga resolviendo sus datos.
  * **Requisito bloqueante previo a implementar la desactivación (PRE-D5):**
    * **Discrepancia conocida en la creación de `Appointment.date`:** El flujo regular de citas construye la fecha con `new Date(data.date + "T00:00:00")` (`appointments.service.ts:42`), que interpreta medianoche en la zona horaria local del servidor. El flujo de invitados usa `new Date(data.date + "T00:00:00Z")` (`appointments.service.ts:127`), que interpreta medianoche UTC. En servidores con zona horaria distinta de UTC, ambos flujos persisten instantes diferentes para la misma fecha calendario.
    * **Consecuencia:** Hasta que esta discrepancia se corrija, la función `buildUTCDate(appointment.date, appointment.endMin)` puede calcular un instante incorrecto, permitiendo desactivar una oferta con una cita aún en curso o bloqueándola indebidamente.
    * **Requisitos obligatorios antes de considerar operativa la regla de desactivación de D5:**
      1. **Unificar la creación de `Appointment.date`** en todos los flujos para que siempre represente medianoche UTC (`T00:00:00.000Z`), conforme al estándar declarado en este documento.
      2. **Evaluar los datos existentes** en la base de datos para determinar si las fechas ya persistidas representan medianoche local o UTC, y definir una estrategia de normalización que preserve la fecha calendario original de cada cita.
      3. **Agregar pruebas unitarias** que validen que la creación de citas produce `Appointment.date` en UTC independientemente de la zona horaria del servidor.
    * **La misión que implemente la lógica de desactivación de servicios no podrá marcarse como completada** hasta que estos tres requisitos estén satisfechos y verificados. La regla de desactivación descrita arriba es el contrato objetivo; no es operativa en el estado actual del código.
  * **Garantía absoluta:** Con esta regla (una vez satisfechos los requisitos PRE-D5), el 100% del historial de citas (pasadas y futuras) queda blindado contra cualquier alteración retroactiva de tarifas o duraciones, eliminando la dependencia de snapshots persistidos hasta su implementación formal en Fase 7.

---

### D6 — Inactivación de Especialidad Taxonómica y Efecto en Ofertas

* **Owner / Scope:** `Catalog` / Invariantes de catálogo.
* **Regla ante desactivación (`Specialty.isActive = false` por ADMIN):**
  * **Nuevas acciones bloqueadas:**
    * No se pueden crear nuevas ofertas basadas en esa especialidad.
    * Los profesionales no pueden enviar nuevas solicitudes de elegibilidad para esa especialidad.
  * **Ofertas existentes en clínicas:**
    * Las ofertas existentes que referencien la especialidad desactivada quedan **inhabilitadas para nuevas reservas** (`bookable = false` en `CatalogReader`).
    * **Preservación histórica:** No se eliminan las filas de `Service` ni de `ProfessionalSpecialty` para proteger los historiales médicos, auditorías y citas ya existentes.
    * Si la especialidad es reactivada por el `ADMIN` (`restore`), las ofertas vuelven a ser elegibles para reserva.

---

### D7 — Formato de Precio, Moneda y Precisión Numérica

* **Owner / Scope:** `Catalog` / Value Objects y DTOs de Contrato.
* **Contrato unívoco acordado:**
  * **Moneda base:** **MXN** (Pesos Mexicanos), moneda unificada de la plataforma. (Soporte multimoneda formalmente diferido a fases posteriores).
  * **Persistencia:** Columna `price Decimal @db.Decimal(10, 2)` en base de datos PostgreSQL.
  * **Invariante de valor:** `price > 0` estricto. Se prohíben valores negativos, cero, infinitos o `NaN`.
  * **Formato externo JSON (DTOs de salida / lectura pública y contratos):**
    * **String decimal con exactamente dos posiciones decimales:** Expresión regular canónica `/^\d+\.\d{2}$/` (ej. `"150.00"`, `"500.50"`).
    * Nunca se serializa como `number` de punto flotante en respuestas JSON, eliminando por diseño los errores de precisión IEEE 754 de JavaScript.
  * **Formato de entrada (DTOs de entrada / Schemas Zod):**
    * Se acepta en el payload JSON un string o número positivo, pero **con un máximo de 2 dígitos decimales**.
    * **Regla de rechazo estricto (sin redondeo silencioso):** Si el cliente envía más de 2 decimales (ej. `"150.555"` o `150.555`), la petición es rechazada de inmediato con `400 Bad Request` indicando `"El precio no puede tener más de 2 decimales"`. No se aplican truncamientos ni redondeos implícitos que oculten discrepancias financieras.

---

### D8 — Estrategia de Backfill y Mapeo de Servicios Legacy

* **Owner / Scope:** `Catalog` / Transición de datos.
* **Situación actual:** En la base de datos de producción/desarrollo existen registros en la tabla `Service` que fueron creados sin pertenencia tenant explícita (únicamente con `profileId` y `specialtyId`).
* **Decisión y política de seguridad de datos:**
  1. **Prohibición de defaults mágicos:** Está estrictamente prohibido asignar tenants por defecto o inventar afiliaciones arbitrarias durante la migración.
  2. **Proceso en tres etapas (Misión 3):**
     * **Etapa 1 (Inventario y Análisis):** Script de inspección que audita todos los servicios existentes y lista las afiliaciones activas de sus respectivos profesionales.
     * **Etapa 2 (Mapeo Unívoco vs Ambiguo):**
       * Si un profesional tiene **exactamente una afiliación activa**, el servicio puede vincularse a esa afiliación en el reporte de propuesta.
       * Si un profesional tiene **múltiples afiliaciones activas o cero afiliaciones**, el servicio se marca como *huérfano/ambiguo* y requiere resolución explícita humana antes de ser migrado.
     * **Etapa 3 (Dry-run y Aprobación):** El backfill solo se ejecuta tras la aprobación expresa del reporte de dry-run.
  3. **Invariante de Misión 0:** Durante la Misión 0 **no se modifica** `schema.prisma` ni se aplica ninguna alteración a la base de datos.

---

## Matriz de Impacto en Fases Posteriores

| Decisión | Módulo Afectado | Fase Impactada | Garantía Acordada |
|---|---|---|---|
| **D2** | Profiles | Fase 4 (cerrada) | Reutiliza `SuspendOnSpecialtyRevokedUseCase` en la misma transacción Prisma con row lock. |
| **D5** | Appointments | Fase 7 | No desactiva servicios con citas futuras activas; no altera retroactivamente citas existentes. **PRE-D5:** regla no operativa hasta unificar creación UTC, evaluar datos existentes y agregar pruebas. |
| **D6** | Appointments | Fase 7 | Especialidad desactivada inhabilita reservas futuras sin romper trazabilidad histórica. |
| **D7** | Appointments / Payments | Fases 7 y 9 | Precio exacto en string/Decimal de 2 decimales, previniendo discrepancias de cobro. |
| **D8** | Tenancy / Profiles | Fases 3 y 4 | Respeto estricto del aislamiento tenant: servicios no asignados no son visibles en ningún tenant. |

---

## Revisión Requerida

Se somete este documento a la revisión del code reviewer para obtener su aprobación formal antes de iniciar la implementación de la **Misión 1 (Taxonomía Specialty)**.

