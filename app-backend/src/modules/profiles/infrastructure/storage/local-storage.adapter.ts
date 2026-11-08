/// ARCHIVO: src/modules/profiles/infrastructure/storage/local-storage.adapter.ts
import path from "path";
import fs from "fs";
import { StoragePort } from "../../application/ports/storage.port";

export class LocalStorageAdapter implements StoragePort {
  async deleteFile(fileUrlOrRelativePath: string): Promise<void> {
    const fileName = path.basename(fileUrlOrRelativePath);
    const filePath = path.join(
      process.cwd(),
      "public",
      "img",
      "avatars",
      fileName
    );

    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      console.error("Error al eliminar archivo en LocalStorageAdapter:", err);
      throw err;
    }
  }
}

