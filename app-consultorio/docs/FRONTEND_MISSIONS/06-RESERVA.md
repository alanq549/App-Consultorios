# Misión 5 — Reserva y disponibilidad

## Objetivo

Hacer una reserva clara y recuperable para clientes registrados e invitados, conectada a disponibilidad y oferta vigentes.

## Dependencias backend

Scheduling (Fase 6) y Appointments (Fase 7) todavía tienen trabajo arquitectónico, aunque ya existen endpoints y aislamiento por afiliación. Coordinar reglas de zona horaria, disponibilidad, concurrencia y cambios de oferta antes de asumir comportamientos.

## Trabajo

- componer pasos de profesional/oferta, fecha/hora, datos y confirmación;
- mostrar horarios disponibles con zona horaria explícita y fecha consistente;
- refrescar o invalidar disponibilidad tras conflicto `409` o rechazo por slot ocupado;
- mantener diferencias de invitado/autenticado sólo donde el contrato las define;
- evitar duplicar solicitudes con doble submit y hacer visible el resultado definitivo del servidor;
- resolver navegación atrás/adelante sin perder contexto útil y sin presentar slots vencidos como reservados.

## Criterios de cierre

- Contratos de availability y create coinciden para guest y usuario autenticado.
- Fecha local, minutos y timezone se muestran y envían según regla documentada.
- Concurrencia/conflicto se comunica y permite elegir otro horario.
- La confirmación sólo se muestra tras respuesta exitosa del backend.
