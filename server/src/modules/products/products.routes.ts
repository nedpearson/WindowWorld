import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { productsService } from './products.service';

const router = Router();

// GET /api/v1/products — full catalog
router.get('/', auth.repOrAbove, (req, res) => {
  const data = productsService.catalog();
  res.json({ success: true, data });
});

// GET /api/v1/products/:id
router.get('/:id', auth.repOrAbove, (req, res) => {
  const data = productsService.getById(req.params.id);
  res.json({ success: true, data });
});

// POST /api/v1/products/calculate — price a single window
router.post('/calculate', auth.repOrAbove, (req, res) => {
  const data = productsService.calculateWindowPrice(req.body);
  res.json({ success: true, data });
});

// GET /api/v1/products/financing/options
router.get('/financing/options', auth.repOrAbove, (req, res) => {
  const data = productsService.financingOptions();
  res.json({ success: true, data });
});

// POST /api/v1/products/financing/calculate
router.post('/financing/calculate', auth.repOrAbove, (req, res) => {
  const { principal, finOptionId } = req.body;
  const data = productsService.calculateMonthlyPayment(parseFloat(principal), finOptionId);
  res.json({ success: true, data });
});

export { router as productsRouter };
