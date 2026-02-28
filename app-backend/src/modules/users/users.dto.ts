import { z } from "zod";

export const UpdateConfigDTO = z.object({
  theme: z.enum(["LIGHT", "DARK"]).optional(),
  language: z.enum(["ES", "EN"]).optional(),
  notificationsEnabled: z.boolean().optional(),
});

export type UpdateConfigInput = z.infer<typeof UpdateConfigDTO>;
