/// ARCHIVO: src/modules/profiles/application/ports/storage.port.ts

export interface StoragePort {
  deleteFile(fileUrlOrRelativePath: string): Promise<void>;
}

