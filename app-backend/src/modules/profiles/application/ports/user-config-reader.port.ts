/// ARCHIVO: src/modules/profiles/application/ports/user-config-reader.port.ts

export interface UserConfigReader {
  getConfig(userId: number): Promise<unknown>;
}

