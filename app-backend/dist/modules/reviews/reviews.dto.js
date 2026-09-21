"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateReviewDTO = void 0;
const zod_1 = require("zod");
exports.CreateReviewDTO = zod_1.z.object({
    appointmentId: zod_1.z.number(),
    rating: zod_1.z.number().min(1).max(5),
    comment: zod_1.z.string().max(500).optional()
});
