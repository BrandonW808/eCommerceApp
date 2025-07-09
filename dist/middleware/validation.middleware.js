"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = exports.validate = void 0;
const express_validator_1 = require("express-validator");
const errors_1 = require("@utils/errors");
const validate = (req, _res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((error) => ({
            field: error.type === 'field' ? error.path : undefined,
            message: error.msg,
            value: error.type === 'field' ? error.value : undefined,
        }));
        throw new errors_1.ValidationError('Validation failed', errorMessages);
    }
    next();
};
exports.validate = validate;
const sanitizeInput = (req, _res, next) => {
    const clean = (obj) => {
        if (typeof obj !== 'object' || obj === null) {
            if (typeof obj === 'string') {
                return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
            }
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(clean);
        }
        const cleaned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cleaned[key] = clean(obj[key]);
            }
        }
        return cleaned;
    };
    req.body = clean(req.body);
    req.query = clean(req.query);
    req.params = clean(req.params);
    next();
};
exports.sanitizeInput = sanitizeInput;
//# sourceMappingURL=validation.middleware.js.map