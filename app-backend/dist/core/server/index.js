"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const seed_1 = require("@/seed");
const app_1 = __importDefault(require("../../app"));
const startServer = async () => {
    const PORT = process.env.PORT || 3000;
    await (0, seed_1.runSeeds)(); // 👈 todos los seeds aquí
    app_1.default.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
};
exports.startServer = startServer;
