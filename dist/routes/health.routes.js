"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = __importDefault(require("@database/connection"));
const package_json_1 = require("../../package.json");
const router = (0, express_1.Router)();
router.get('/health', async (_req, res) => {
    const healthCheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: package_json_1.version || '1.0.0',
        uptime: process.uptime(),
        services: {
            database: false,
        },
    };
    try {
        healthCheck.services.database = connection_1.default.isHealthy();
        const response = {
            success: true,
            data: healthCheck,
        };
        res.json(response);
    }
    catch (error) {
        healthCheck.status = 'unhealthy';
        const response = {
            success: false,
            data: healthCheck,
            error: {
                code: 'HEALTH_CHECK_FAILED',
                message: 'One or more services are unhealthy',
            },
        };
        res.status(503).json(response);
    }
});
router.get('/ping', (_req, res) => {
    res.json({ pong: true });
});
router.get('/ready', async (_req, res) => {
    try {
        const isDatabaseReady = await connection_1.default.ping();
        if (isDatabaseReady) {
            res.json({ ready: true });
        }
        else {
            res.status(503).json({ ready: false, reason: 'Database not ready' });
        }
    }
    catch (error) {
        res.status(503).json({ ready: false, reason: 'Service not ready' });
    }
});
router.get('/metrics', (_req, res) => {
    res.json({
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
    });
});
exports.default = router;
//# sourceMappingURL=health.routes.js.map