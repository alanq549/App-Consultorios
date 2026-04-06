/// src/core/storage/upload.ts
import multer, { MulterError } from "multer";
import path from "node:path";

export function createUploader(folder: string) {
  const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, path.join(process.cwd(), "public", folder));
    },
    filename: function (_req, file, cb) {
      const safeName = file.originalname.replace(/\s+/g, "-").toLowerCase();
      const unique = Date.now() + "-" + safeName;
      cb(null, unique);
    },
  });

  const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
    const allowed = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/jpg",
      "application/pdf",
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(new MulterError("LIMIT_UNEXPECTED_FILE"));
    }
    cb(null, true);
  };

  return multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter,
  });
}
