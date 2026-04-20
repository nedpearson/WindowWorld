"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_service_1 = require("./auth.service");
const auth_1 = require("../../shared/middleware/auth");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
const router = (0, express_1.Router)();
exports.authRouter = router;
function validateRequest(req) {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const errorMap = {};
        errors.array().forEach((e) => {
            if (!errorMap[e.path])
                errorMap[e.path] = [];
            errorMap[e.path].push(e.msg);
        });
        throw new errorHandler_1.ValidationError('Validation failed', errorMap);
    }
}
// POST /api/v1/auth/login
router.post('/login', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    (0, express_validator_1.body)('password').isLength({ min: 1 }).withMessage('Password required'),
], async (req, res) => {
    validateRequest(req);
    const { email, password } = req.body;
    const result = await auth_service_1.authService.login(email, password);
    res.json({ success: true, data: result });
});
// POST /api/v1/auth/google
router.post('/google', [
    (0, express_validator_1.body)('idToken').isString().notEmpty().withMessage('Google ID token required'),
], async (req, res) => {
    validateRequest(req);
    const { idToken } = req.body;
    const result = await auth_service_1.authService.googleLogin(idToken);
    res.json({ success: true, data: result });
});
// POST /api/v1/auth/refresh
router.post('/refresh', [(0, express_validator_1.body)('refreshToken').isString().notEmpty().withMessage('Refresh token required')], async (req, res) => {
    validateRequest(req);
    const { refreshToken } = req.body;
    const tokens = await auth_service_1.authService.refreshTokens(refreshToken);
    res.json({ success: true, data: tokens });
});
// POST /api/v1/auth/logout
router.post('/logout', auth_1.requireAuth, async (req, res) => {
    const { refreshToken } = req.body;
    const user = req.user;
    if (refreshToken) {
        await auth_service_1.authService.logout(refreshToken, user.id);
    }
    res.json({ success: true, message: 'Logged out successfully' });
});
// POST /api/v1/auth/logout-all
router.post('/logout-all', auth_1.requireAuth, async (req, res) => {
    const user = req.user;
    await auth_service_1.authService.logoutAll(user.id);
    res.json({ success: true, message: 'All sessions terminated' });
});
// GET /api/v1/auth/me
router.get('/me', auth_1.requireAuth, async (req, res) => {
    const user = req.user;
    const me = await auth_service_1.authService.getMe(user.id);
    res.json({ success: true, data: me });
});
// POST /api/v1/auth/change-password
router.post('/change-password', auth_1.requireAuth, [
    (0, express_validator_1.body)('currentPassword').isLength({ min: 1 }).withMessage('Current password required'),
    (0, express_validator_1.body)('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
], async (req, res) => {
    validateRequest(req);
    const user = req.user;
    const { currentPassword, newPassword } = req.body;
    await auth_service_1.authService.changePassword(user.id, currentPassword, newPassword);
    res.json({ success: true, message: 'Password changed successfully' });
});
//# sourceMappingURL=auth.routes.js.map