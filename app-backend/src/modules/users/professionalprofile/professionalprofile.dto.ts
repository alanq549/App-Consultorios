// src/modules/users/professionalprofile/professionalprofile.dto.ts
import { z } from "zod";

export const GetProfessionalProfileParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID inválido"),
});

