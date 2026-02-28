"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigController = void 0;
const config_service_1 = require("./config.service");
const config_dto_1 = require("./config.dto");
class ConfigController {
    static async me(req, res, next) {
        try {
            const userId = req.user.id;
            const config = await config_service_1.ConfigService.getByUser(userId);
            res.json(config);
        }
        catch (err) {
            next(err);
        }
    }
    static async update(req, res, next) {
        try {
            const userId = req.user.id;
            const data = config_dto_1.UpdateConfigDTO.parse(req.body);
            const config = await config_service_1.ConfigService.update(userId, data);
            res.json(config);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ConfigController = ConfigController;
