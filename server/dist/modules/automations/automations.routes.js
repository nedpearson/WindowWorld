"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.automationsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
// TODO: Import service
const router = (0, express_1.Router)();
exports.automationsRouter = router;
// Placeholder — full implementation in progress
router.get('/', auth_1.auth.repOrAbove, (req, res) => {
    res.json({ success: true, data: [], module: 'automations', status: 'placeholder' });
});
//# sourceMappingURL=automations.routes.js.map