"use strict";
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