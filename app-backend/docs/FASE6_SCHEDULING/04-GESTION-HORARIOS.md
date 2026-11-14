# Misión 3 — Gestión de horarios

## Objetivo

Migrar Create/Update/Deactivate Schedule con validaciones de dominio, ownership y política explícita para citas existentes.

## Archivos a crear/tocar

- Crear casos de uso/repositorios en `src/modules/scheduling/`; adaptar `schedule.controller.ts`, `schedule.service.ts`, DTO y routes legacy.
- Aplicar el scope decidido en Misión 2 y el contrato temporal de Misión 1.
- Crear port de impacto/consulta de citas con Appointments; no importar su repositorio Prisma.
- `CreateSchedule`, `UpdateSchedule` y `DeactivateSchedule` abren transacción y adquieren `lockProfessionalProfileForUpdate(profileId, tx)` antes de leer horarios/citas o clasificar la mutación. Mantienen el lock hasta validar y escribir.
- En update/deactivate, `profileId` proviene del perfil autenticado; no buscar primero el `Schedule` por ID para descubrir su dueño. Tras tomar el lock, cargarlo con `where: { id, profileId }` y devolver no encontrado/no autorizado si no coincide.
- Añadir pruebas de rango, múltiplos de 15, solapamiento, permisos, concurrencia de edición y citas futuras.

## Reglas

- Actualización/desactivación se bloquea si deja cualquier cita futura/activa `PENDING` o `CONFIRMED` fuera de todos los bloques activos resultantes de su fecha/día en la zona snapshot de la cita; no reprogramar ni cancelar automáticamente.
- Cambios aditivos o cambios que sigan cubriendo íntegramente esas citas son permitidos. `CANCELLED` y `COMPLETED` no impiden el cambio.
- Consultar por fecha civil/instante según contrato aprobado, no `date >= new Date()` sobre medianoche UTC.
- Validar solapamientos concurrentes bajo el lock por perfil (serialización obligatoria) y conservar validación de dominio; una transacción sin ese lock no es garantía suficiente.
- Reservas normal y guest adquieren el mismo lock de perfil antes de leer la agenda y crear la cita; mantener orden de locks común.
- No borrar horarios referenciados ni modificar/cancelar citas de forma implícita.

## Aceptación

- Cambios incompatibles con reservas futuras aplican el resultado aprobado sin escritura parcial.
- Citas de hoy y cruces de zona/DST no se omiten en la detección.
- Es imposible insertar/update solapamientos bajo requests concurrentes.
- Tests DB real cubren dos creates y dos updates simultáneos al mismo perfil, con rangos que se solapan y cambios individualmente aditivos contra un estado previo.
- Pruebas DB real de reserva vs update/desactivación cubren ambos órdenes; incluir createGuest. Como máximo una operación incompatible confirma y todo estado final respeta cobertura.
- Errores de dominio se traducen explícitamente al contrato HTTP; compatibilidad verificada.
