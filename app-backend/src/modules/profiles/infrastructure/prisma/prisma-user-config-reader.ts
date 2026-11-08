/// ARCHIVO: src/modules/profiles/infrastructure/prisma/prisma-user-config-reader.ts
import { ConfigService } from "@/modules/config/config.service";
import { UserConfigReader } from "../../application/ports/user-config-reader.port";

export class PrismaUserConfigReader implements UserConfigReader {
  async getConfig(userId: number): Promise<unknown> {
    return ConfigService.getByUser(userId);
  }
}

