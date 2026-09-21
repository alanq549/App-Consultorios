# Guía de DTOs, Interfaces y Tipos para Backend

## Objetivo

Normalizar la definición de inputs, outputs, contratos de repositorios y tipos internos para que el backend sea más claro, mantenible y seguro para migrar a SaaS.

## Regla principal

No mezclar:
- DTO de entrada
- DTO de salida
- interfaces de repositorio
- tipos internos del dominio
- tipos de Express Request

Cada uno debe vivir en su sitio y con su convención.

---

## 1. DTOs

Los DTOs representan el contrato externo de la API.

### Debe hacer
- validación de entrada con Zod
- definir campos esperados
- mantener nombres claros
- ser exportados desde `*.dto.ts`

### Ejemplo correcto

```ts
export const CreateAppointmentSchema = z.object({
  serviceId: z.number().int().positive(),
  professionalProfileId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMin: z.number().int().min(0).max(1439),
  notes: z.string().optional(),
});

export type CreateAppointmentDto = z.infer<typeof CreateAppointmentSchema>;
```

### Evitar

```ts
export const UpdateProfileDTO = z.object({ ... });
export type UpdateProfileDTO = z.infer<typeof UpdateProfileDTO>;
```

Esto es ambiguo y confuso. Mejor usar:

```ts
export const UpdateProfileSchema = z.object({ ... });
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
```

---

## 2. Interfaces

Las interfaces deben describir contratos externos o internos de objetos que serán implementados.

### Para repositorios

```ts
export interface UserRepository {
  findById(id: number): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(data: CreateUserInput): Promise<UserEntity>;
}
```

### Para servicios

```ts
export interface MailService {
  sendVerification(email: string, token: string): Promise<void>;
  sendPasswordReset(email: string, token: string): Promise<void>;
}
```

### Reglas
- usar interfaces para contratos de implementación
- no poner interfaces en archivos de montón, deben estar junto al dominio o infraestructura
- si no existe implementacion real, no inventar un `interface` innecesario

---

## 3. Tipos internos

Los tipos internos representan el dominio o un objeto de negocio, no un payload HTTP.

### Ejemplo

```ts
export type AuthUser = {
  id: number;
  email: string;
  role: Role;
  isVerified: boolean;
  tenantId: number;
};
```

### Usar para
- contexto del usuario autenticado
- modelos del dominio
- payloads de infraestructura
- estructuras internas

### Evitar
- usar `type` para definir validaciones de request
- usar `interface` e `type` mezclados con el mismo nombre

---

## 4. Express Request / User types

Los tipos de Express deben mantenerse muy mínimos.

```ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: Role;
        tenantId: number;
      };
    }
  }
}
```

### Mover a un tipo explícito

```ts
export type AuthenticatedUser = {
  id: number;
  role: Role;
  tenantId: number;
};
```

Y luego:

```ts
interface Request {
  user?: AuthenticatedUser;
}
```

Esto hace el sistema más claro.

---

## 5. Pattern recomendado por capa

```text
controller -> use-case -> service -> repository
```

### En el controller
- usa DTO schema
- convierte input
- llama al use-case

### En el use-case
- valida reglas de alto nivel
- coordina repositorios
- orquesta servicios

### En el service
- lógica de dominio o lógica reusable
- no debería depender de Express

### En el repository
- abstrae Prisma, SQL, OO, etc.

---

## 6. Naming conventions

Usar estas reglas en todo el backend:

### Schemas
- `CreateUserSchema`
- `LoginSchema`
- `UpdateProfileSchema`

### Types / DTOs
- `CreateUserDto`
- `LoginDto`
- `UpdateProfileDto`

### Interfaces
- `UserRepository`
- `MailService`
- `AppointmentGateway`

### Entities
- `UserEntity`
- `AppointmentEntity`
- `NotificationEntity`

### Evitar
- `CreateUserDTO`
- `RegisterDTO`
- `XDto` sin estructura clara
- `type UpdateProfileDTO` reusado como identicador del schema

---

## 7. Reglas para limpieza del código actual

### Refactor de módulos actuales

En cada módulo:
- revisar si la clase estática tiene más de 5 responsabilidades
- mover lógica a repository o use-case
- renombrar los schemas Zod para `Schema` y tipos para `Dto`
- eliminar `any`
- revisar si hay transformaciones de respuesta dentro del servicio

### Criterio de aceptación

Un archivo está bien refactorizado si:
- [ ] no tiene lógica de persistencia junto a lógica de validación
- [ ] no tiene `any` en capas claves
- [ ] los nombres de archivo y tipo son consistentes
- [ ] la API externa usa DTOs claros
- [ ] la lógica de negocio es separada de side effects

---

## 8. Estandar recomendado para app-backend

```text
src/
  modules/auth/
    auth.controller.ts
    auth.routes.ts
    auth.schema.ts
    auth.dto.ts
    auth.use-case.ts
    auth.service.ts
    auth.repository.ts
    auth.types.ts
```

Esto elimina ambigüedad entre:
- schema de validación
- contrato HTTP
- implementación concreta

---

## 9. Conclusión

El backend necesita un estándar claro para DTOs, interfaces y tipos. Si no se hace, se siguen mezclando contratos entre HTTP, negocio y persistencia. Eso es un problema grande para una evolución hacia SaaS, porque todo se vuelve más difícil de escalar, testear y proteger por tenant.

Esta guía debe usarse como standard mínimo para todos los nuevos módulos y para los refactors de los actuales.
