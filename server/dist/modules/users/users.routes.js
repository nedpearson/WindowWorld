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
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../../shared/middleware/auth");
const users_service_1 = require("./users.service");
const router = (0, express_1.Router)();
exports.usersRouter = router;
router.get('/', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const { role, search, isActive } = req.query;
    const data = await users_service_1.usersService.list(user.organizationId, {
        role: role,
        search,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
    res.json({ success: true, data });
});
router.get('/leaderboard', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const period = req.query.period || 'month';
    const data = await users_service_1.usersService.getLeaderboard(user.organizationId, period);
    res.json({ success: true, data });
});
// ⚠️  /me MUST be before /:id — otherwise Express matches "me" as an ID param
router.get('/me', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await users_service_1.usersService.getById(user.id);
    res.json({ success: true, data });
});
router.patch('/me/preferences', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const { prisma } = await Promise.resolve().then(() => __importStar(require('../../shared/services/prisma')));
    const updated = await prisma.user.update({
        where: { id: user.id },
        data: { notifPreferences: req.body },
        select: { id: true, notifPreferences: true },
    });
    res.json({ success: true, data: updated });
});
router.get('/:id', auth_1.auth.manager, async (req, res) => {
    const data = await users_service_1.usersService.getById(req.params.id);
    res.json({ success: true, data });
});
router.post('/', auth_1.auth.manager, [
    (0, express_validator_1.body)('email').isEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 8 }),
    (0, express_validator_1.body)('firstName').notEmpty(),
    (0, express_validator_1.body)('lastName').notEmpty(),
    (0, express_validator_1.body)('role').notEmpty(),
], async (req, res) => {
    const user = req.user;
    const data = await users_service_1.usersService.create({ ...req.body, organizationId: user.organizationId }, user.id);
    res.status(201).json({ success: true, data });
});
router.patch('/:id', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const data = await users_service_1.usersService.update(req.params.id, req.body, user.id);
    res.json({ success: true, data });
});
router.patch('/:id/deactivate', auth_1.auth.superAdmin, async (req, res) => {
    const user = req.user;
    await users_service_1.usersService.deactivate(req.params.id, user.id);
    res.json({ success: true, message: 'User deactivated' });
});
//# sourceMappingURL=users.routes.js.map