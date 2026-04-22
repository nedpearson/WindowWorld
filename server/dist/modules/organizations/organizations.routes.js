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
exports.organizationsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const organizations_service_1 = require("./organizations.service");
const router = (0, express_1.Router)();
exports.organizationsRouter = router;
// GET /teams/me — current user's org with team and territories
router.get('/me', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const [data, stats] = await Promise.all([
        organizations_service_1.organizationService.getById(user.organizationId),
        organizations_service_1.organizationService.getStats(user.organizationId),
    ]);
    res.json({ success: true, data: { ...data, stats } });
});
// PATCH /teams/me — update org settings (manager+ only)
router.patch('/me', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const data = await organizations_service_1.organizationService.update(user.organizationId, user.id, req.body);
    res.json({ success: true, data });
});
// GET /teams/me/commission-tiers — returns tiers stored in org.settings
router.get('/me/commission-tiers', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const { prisma } = await Promise.resolve().then(() => __importStar(require('../../shared/services/prisma')));
    const org = await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { settings: true },
    });
    const settings = org?.settings || {};
    res.json({ success: true, data: settings.commissionTiers || null });
});
// PATCH /teams/me/commission-tiers — save tiers into org.settings JSON
router.patch('/me/commission-tiers', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const { prisma } = await Promise.resolve().then(() => __importStar(require('../../shared/services/prisma')));
    const org = await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { settings: true } });
    const existingSettings = org?.settings || {};
    const updated = await prisma.organization.update({
        where: { id: user.organizationId },
        data: { settings: { ...existingSettings, commissionTiers: req.body.tiers } },
        select: { settings: true },
    });
    res.json({ success: true, data: updated.settings?.commissionTiers });
});
// For backwards compat — also mount on /:id
router.get('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    // Security: users can only view their own org
    if (req.params.id !== user.organizationId && user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const data = await organizations_service_1.organizationService.getById(String(req.params.id));
    res.json({ success: true, data });
});
router.patch('/:id', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    if (String(req.params.id) !== user.organizationId && user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const data = await organizations_service_1.organizationService.update(String(req.params.id), String(user.id), req.body);
    res.json({ success: true, data });
});
//# sourceMappingURL=organizations.routes.js.map