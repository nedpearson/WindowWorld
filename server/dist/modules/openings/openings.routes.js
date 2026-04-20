"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openingsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
// TODO: Import service
const router = (0, express_1.Router)();
exports.openingsRouter = router;
// Placeholder — full implementation in progress
router.get('/', auth_1.auth.repOrAbove, (req, res) => {
    res.json({ success: true, data: [], module: 'openings', status: 'placeholder' });
});
//# sourceMappingURL=openings.routes.js.map