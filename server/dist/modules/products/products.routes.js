"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const products_service_1 = require("./products.service");
const router = (0, express_1.Router)();
exports.productsRouter = router;
// GET /api/v1/products â€” full catalog
router.get('/', auth_1.auth.repOrAbove, (req, res) => {
    const data = products_service_1.productsService.catalog();
    res.json({ success: true, data });
});
// GET /api/v1/products/:id
router.get('/:id', auth_1.auth.repOrAbove, (req, res) => {
    const data = products_service_1.productsService.getById(req.params.id);
    res.json({ success: true, data });
});
// POST /api/v1/products/calculate â€” price a single window
router.post('/calculate', auth_1.auth.repOrAbove, (req, res) => {
    const data = products_service_1.productsService.calculateWindowPrice(req.body);
    res.json({ success: true, data });
});
// GET /api/v1/products/financing/options
router.get('/financing/options', auth_1.auth.repOrAbove, (req, res) => {
    const data = products_service_1.productsService.financingOptions();
    res.json({ success: true, data });
});
// POST /api/v1/products/financing/calculate
router.post('/financing/calculate', auth_1.auth.repOrAbove, (req, res) => {
    const { principal, finOptionId } = req.body;
    const data = products_service_1.productsService.calculateMonthlyPayment(parseFloat(principal), finOptionId);
    res.json({ success: true, data });
});
//# sourceMappingURL=products.routes.js.map