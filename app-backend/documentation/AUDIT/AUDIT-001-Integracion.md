# AUDIT-001 — Integración

## Alcance

Contratos HTTP, sesión, serialización y flujos entre `app-consultorio` y `app-backend`.

## Hallazgos

| Backend | Frontend relacionado | Severidad | Título |
|---|---|---|---|
| BUG-003 | BUG-007 | Alta | Fecha y zona horaria inconsistentes |
| BUG-008 | BUG-008 | Media | Fallo de configuración invalida sesión válida |
| SEC-003 | SEC-003 | Media | Tokens persistidos en localStorage |
| EC-004 | EC-004 | Baja | Contratos API duplicados |

El contenido completo de cada problema transversal se conserva en una sola tarjeta. Su contraparte contiene únicamente contexto del área y referencia cruzada.

## Prioridad

1. Normalizar fecha civil y zona horaria.
2. Separar validación de sesión de la carga de configuración.
3. Diseñar almacenamiento seguro del refresh token.
4. Establecer contratos de transporte verificables por dominio.

## Limitaciones

No se capturó tráfico real ni se ejecutaron pruebas en zonas horarias distintas.

## Convención de numeración

Los identificadores son globales al repositorio. Cuando un hallazgo exige cambios en ambas aplicaciones puede existir el mismo ID en ambas; el informe identifica la fuente canónica y la contraparte debe limitarse a una referencia. BUG-003/BUG-007 conserva su numeración histórica y no debe usarse como precedente para nuevos hallazgos.
