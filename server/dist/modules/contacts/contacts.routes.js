"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactsRouter = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../../shared/middleware/auth");
const contacts_service_1 = require("./contacts.service");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
const router = (0, express_1.Router)();
exports.contactsRouter = router;
function validate(req) {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const map = {};
        errors.array().forEach((e) => { if (!map[e.path])
            map[e.path] = []; map[e.path].push(e.msg); });
        throw new errorHandler_1.ValidationError('Validation failed', map);
    }
}
// GET /api/v1/contacts/lead/:leadId
router.get('/lead/:leadId', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const contacts = await contacts_service_1.contactsService.listByLead(req.params.leadId, user.organizationId);
    res.json({ success: true, data: contacts });
});
// GET /api/v1/contacts/:id
router.get('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const contact = await contacts_service_1.contactsService.getById(req.params.id);
    res.json({ success: true, data: contact });
});
// POST /api/v1/contacts
router.post('/', auth_1.auth.repOrAbove, [
    (0, express_validator_1.body)('firstName').notEmpty().withMessage('First name required'),
    (0, express_validator_1.body)('lastName').notEmpty().withMessage('Last name required'),
    (0, express_validator_1.body)('email').optional().isEmail(),
    (0, express_validator_1.body)('phone').optional().isString(),
], async (req, res) => {
    validate(req);
    const user = req.user;
    const contact = await contacts_service_1.contactsService.create({ ...req.body, userId: user.id });
    res.status(201).json({ success: true, data: contact });
});
// PATCH /api/v1/contacts/:id
router.patch('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const contact = await contacts_service_1.contactsService.update(req.params.id, req.body, user.id);
    res.json({ success: true, data: contact });
});
// DELETE /api/v1/contacts/:id
router.delete('/:id', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    await contacts_service_1.contactsService.delete(req.params.id, user.id);
    res.json({ success: true, message: 'Contact deleted' });
});
//# sourceMappingURL=contacts.routes.js.map