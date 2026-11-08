/// ARCHIVO: src/core/storage/upload.ts
import fs from "node:fs";
import multer, { MulterError } from "multer";
import path from "node:path";

export const MIME_EXTENSIONS: Record<string, string[]> = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/jpg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

/**
 * Valida la firma binaria (magic bytes) del archivo para certificar el formato real del contenido.
 */
export function validateFileMagicBytes(
  buffer: Buffer,
  allowedMimeTypes: string[]
): string | null {
  if (!buffer || buffer.length < 4) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    allowedMimeTypes.includes("image/png") &&
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (
    (allowedMimeTypes.includes("image/jpeg") || allowedMimeTypes.includes("image/jpg")) &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  // WEBP: RIFF .... WEBP
  if (
    allowedMimeTypes.includes("image/webp") &&
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  // PDF: %PDF (25 50 44 46)
  if (
    allowedMimeTypes.includes("application/pdf") &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "application/pdf";
  }

  return null;
}

export class InvalidFileContentError extends Error {
  constructor(
    message = "El contenido del archivo no coincide con un formato de imagen válido"
  ) {
    super(message);
    this.name = "InvalidFileContentError";
  }
}

export class MimeTypeMismatchError extends Error {
  constructor(
    message = "El formato real de la imagen no coincide con el tipo MIME declarado"
  ) {
    super(message);
    this.name = "MimeTypeMismatchError";
  }
}

export function normalizeMimeType(mime: string): string {
  if (!mime) return "";
  if (mime === "image/jpg") return "image/jpeg";
  return mime.toLowerCase();
}

/**
 * Inspecciona los primeros bytes del archivo en disco para validar que no sea contenido falsificado (ej. HTML ejecutable).
 */
export async function validateUploadedFileContent(
  filePath: string,
  allowedMimeTypes: string[]
): Promise<string> {
  const fileHandle = await fs.promises.open(filePath, "r");
  const buffer = Buffer.alloc(16);
  try {
    const { bytesRead } = await fileHandle.read(buffer, 0, 16, 0);
    const mime = validateFileMagicBytes(buffer.subarray(0, bytesRead), allowedMimeTypes);
    if (!mime) {
      throw new InvalidFileContentError();
    }
    return mime;
  } finally {
    await fileHandle.close();
  }
}

export function createUploader(
  folder: string,
  allowedMimeTypes: string[] = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/jpg",
    "application/pdf",
  ],
  maxSizeBytes: number = 10 * 1024 * 1024
) {
  const uploadPath = path.join(process.cwd(), "public", folder);

  // Asegurar que la carpeta exista siempre
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, uploadPath);
    },
    filename: function (_req, file, cb) {
      // Asignar extensión fija y segura según el formato validado (NUNCA confiar en originalname)
      const primaryExt = MIME_EXTENSIONS[file.mimetype]?.[0] || ".bin";
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}${primaryExt}`;
      cb(null, unique);
    },
  });

  const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
    // 1. Validar que el MIME declarado pertenezca a la lista permitida
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new MulterError("LIMIT_UNEXPECTED_FILE"));
    }

    // 2. Rechazar extensiones inconsistentes con el MIME declarado (ej. payload.html con image/png)
    const ext = path.extname(file.originalname).toLowerCase();
    const validExtensions = MIME_EXTENSIONS[file.mimetype];
    if (!validExtensions || !validExtensions.includes(ext)) {
      return cb(new MulterError("LIMIT_UNEXPECTED_FILE"));
    }

    cb(null, true);
  };

  return multer({
    storage,
    limits: { fileSize: maxSizeBytes },
    fileFilter,
  });
}
