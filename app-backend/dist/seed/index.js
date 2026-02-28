"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSeeds = void 0;
const admin_seed_1 = require("./admin.seed");
const professional_seed_1 = require("./professional.seed");
const schedule_seed_1 = require("./schedule.seed");
const specialty_seed_1 = require("./specialty.seed");
// import { seedRoles } from './roles.seed';
// import { seedUsers } from './users.seed';
const runSeeds = async () => {
    console.log("🌱 Ejecutando seeds...");
    try {
        await (0, admin_seed_1.seedAdmin)();
        await (0, specialty_seed_1.seedSpecialties)();
        await (0, professional_seed_1.seedProfessionals)();
        await (0, schedule_seed_1.seedSchedules)();
    }
    catch (err) {
        console.error("Error ejecutando seeds:", err);
    }
    console.log("✅ Seeds completados");
};
exports.runSeeds = runSeeds;
