# Misión 0 — Decisiones de diseño de Scheduling

**Estado: READY FOR REVIEW — propuestas concretas; requieren aprobación formal antes de implementar.** No modificar código, schema ni datos en esta misión.

## Evidencia

- Fase 3 E aprobó `Schedule` global por `ProfessionalProfile`; tenant solo controla visibilidad y acceso público. `Schedule` no tiene `tenantId`.
- `Tenant` y `ProfessionalProfile` no tienen timezone. `Appointment.date` codifica fecha a medianoche UTC; `startMin` se combina actualmente como UTC. El DTO acepta `0–6`; en cambio, reserva/fixtures y algunos seeds usan `1–7`, con al menos un comentario del seed que no coincide con `7`.
- Disponibilidad genera inicios cada 15 min desde el comienzo del bloque, sin buffers; exige duración completa, excluye `CANCELLED` y filtra horas pasadas de hoy. No hay lead time ni máximo configurados.
- Reserva bloquea la fila de Service y busca solapamientos, pero no serializa servicios distintos; DB solo garantiza inicio idéntico.
- El caso de uso actual de edición de perfil solo permite nombre, apellido y teléfono; no existe flujo de configuración/cambio de zona.

## Decisiones propuestas

| ID | Decisión propuesta | Motivo / consecuencia |
|---|---|---|
| D0-1 Tiempo | Zona IANA requerida en `ProfessionalProfile`, propiedad de Profiles; se configura por flujo dedicado D0-9. `Appointment.date` queda como fecha civil en UTC midnight; `startMin/endMin` son minutos locales. Reservas nuevas guardan zona snapshot y `startsAt/endsAt @db.Timestamptz(3)` autoritativos. Rechazar horas DST inexistentes/ambiguas. Sin zona, no se ofrece disponibilidad ni se reserva. | No usar timezone del servidor ni del tenant: tenant no tiene zona y la agenda es global. |
| D0-2 Semana | ISO `1=lunes … 7=domingo`. Normalizar `0→7` solo si el origen confirma que `0` era domingo; conservar `1–6`. Auditar valores `7` por provenance (seed con comentario contradictorio); no migrar filas dudosas automáticamente. | Alinea el contrato con la reserva actual sin adivinar datos. Corregir DTO y seed. |
| D0-3 Ownership | Agenda global del perfil, ya aprobada en Fase 3 E. No agregar `tenantId` ni duplicar horario por afiliación. Tenant activo/afiliación ACTIVE habilitan proyección; reservas del profesional compiten globalmente entre clínicas. | Preserva el comportamiento existente; no admite horarios físicos distintos por clínica. |
| D0-4 Autoridad | Scheduling es dueño de bloques semanales y política pura de slots. Appointments confirma/persiste reservas y revalida en su transacción con la misma política. No soportar excepciones/feriados por fecha en Fase 6. | Disponibilidad es informativa; no crea ni retiene slots. |
| D0-5 Concurrencia | Reemplazar `@@unique([professionalProfileId,date,startMin])` por `EXCLUDE USING gist` sobre profesional y `tstzrange(startsAt,endsAt,'[)')`, parcial para `status <> 'CANCELLED'`, con `btree_gist`. Instantes UTC `@db.Timestamptz(3)` y `startsAt < endsAt`; violación → HTTP 409. | Evita solapamientos entre servicios/tenants; adyacentes válidos. Requiere resolver colisiones existentes y validar extensión en staging. |
| D0-6 Cambios de agenda | `CreateSchedule`, `UpdateSchedule` y `DeactivateSchedule` toman `lockProfessionalProfileForUpdate` al inicio de su transacción, antes de leer schedules/citas o decidir si el cambio es aditivo. Validar solapamientos y cobertura, y escribir bajo ese lock. Rechazar cambios que dejen una cita activa `PENDING/CONFIRMED` fuera del horario resultante; no reprogramar/cancelar implícitamente. | Toda mutación del mismo perfil queda serializada con otras mutaciones y reservas; evita decisiones obsoletas de cobertura y bloques duplicados/solapados. |
| D0-7 Slots | Preservar: paso 15 min desde inicio del bloque; buffers 0; lead time 0 (no ofrecer pasado ni inicio `<= ahora` hoy); sin máximo; todo estado excepto `CANCELLED` ocupa; duración completa, sin slots parciales. | Congela el comportamiento observable; cualquier cambio requiere decisión explícita. |
| D0-8 DST/cambio de zona | Rechazar inicios inexistentes/ambiguos; duración es tiempo transcurrido (`endsAt = startsAt + durationMin`) y queda dentro de límites reales del bloque. Si un límite no es representable de forma única, cerrar el bloque ese día. No cambiar zona con citas futuras/en curso `PENDING/CONFIRMED`; citas guardan snapshot. | Evita horas con cero/dos instantes y preserva instantes al cruzar cambios DST/zona. |

## D0-9 — Configurar y cambiar zona en Profiles

- Añadir operación dedicada autenticada, propuesta `PUT /api/professionals/me/time-zone` con `{ timeZone }`; no ampliar el PATCH genérico de datos personales. Solo el titular `PROFESSIONAL` cambia su zona.
- `SetProfessionalTimeZone` valida un identificador IANA existente. Configuración inicial requiere valor explícito. No hay default, herencia del tenant ni fallback a UTC/host. Sin zona, disponibilidad/reserva fallan explícitamente.
- El campo puede quedar nullable solo durante el rollout; `NULL` nunca se interpreta como una zona. La configuración inicial se bloquea mientras haya citas activas legacy, migradas con snapshot UTC, hasta que terminen/se cancelen.
- En una transacción, adquirir `ProfessionalProfile FOR UPDATE`, consultar citas `PENDING/CONFIRMED` con `endsAt > now`; si hay alguna, rechazar sin escritura. Solo entonces actualizar la zona.
- Implementar el protocolo mediante helper compartido `lockProfessionalProfileForUpdate(profileId, tx)` que requiere `TransactionContext`; no duplicar SQL ni permitir lock fuera de la transacción.
- `CreateSchedule`, `UpdateSchedule` y `DeactivateSchedule` abren transacción y adquieren este lock como primera operación, antes de cargar el schedule actual, listar bloques, consultar citas o clasificar si el cambio reduce cobertura.
- `AppointmentService.create/createGuest` adquieren primero el lock de perfil y después el lock de Service existente; luego leen la zona y crean la cita antes del commit. Ambos caminos usan ese orden y contexto transaccional.
- Todas las mutaciones de horario mantienen el lock durante lectura, validación de solapamiento/cobertura y escritura; no permitir una rama “aditiva” sin lock ni transacción. Reservas lo mantienen durante lectura del horario y creación de la cita.
- Prueba con DB real las dos carreras: reserva primero → cambio detecta cita y falla; cambio primero → reserva lee la nueva zona. Nunca persistir una cita calculada con zona obsoleta.

## Cierre de misión

- Reviewer acepta/rechaza cada D0; alternativas registran efectos en schema, compatibilidad, backfill y pruebas.
- Actualizar baseline y misiones dependientes. Hasta aprobación formal: **no autorizado código/schema/migraciones**.
- Probar en DB real mutación de horario vs reserva, en ambas órdenes y con reserva guest: reserva primero → mutación ve la cita y falla si la deja fuera; mutación primero → reserva espera, lee horario nuevo y se rechaza si queda fuera. Nunca confirmar ambos resultados incompatibles.
- Probar en DB real dos `CreateSchedule`/`UpdateSchedule` concurrentes al mismo perfil, incluyendo cambios que individualmente parecen aditivos: ambas serializan antes de leer y no pueden producir bloques solapados ni dejar citas sin cobertura.
- La persistencia temporal no sustituye snapshots de precio/duración de Fase 7.
