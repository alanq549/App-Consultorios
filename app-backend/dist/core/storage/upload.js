"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUploader = createUploader;
const node_fs_1 = __importDefault(require("node:fs"));
const multer_1 = __importStar(require("multer"));
const node_path_1 = __importDefault(require("node:path"));
function createUploader(folder) {
    const uploadPath = node_path_1.default.join(process.cwd(), "public", folder);
    // 👇 asegurar que la carpeta exista SIEMPRE
    if (!node_fs_1.default.existsSync(uploadPath)) {
        node_fs_1.default.mkdirSync(uploadPath, { recursive: true });
    }
    const storage = multer_1.default.diskStorage({
        destination: function (_req, _file, cb) {
            cb(null, uploadPath);
        },
        filename: function (_req, file, cb) {
            const safeName = file.originalname.replace(/\s+/g, "-").toLowerCase();
            const unique = Date.now() + "-" + safeName;
            cb(null, unique);
        },
    });
    const fileFilter = (_req, file, cb) => {
        const allowed = [
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/jpg",
            "application/pdf",
        ];
        if (!allowed.includes(file.mimetype)) {
            return cb(new multer_1.MulterError("LIMIT_UNEXPECTED_FILE"));
        }
        cb(null, true);
    };
    return (0, multer_1.default)({
        storage,
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter,
    });
}
