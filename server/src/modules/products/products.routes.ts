import { Router, Request, Response } from 'express';
import { auth } from '../../shared/middleware/auth';
import { productsService } from './products.service';

const router = Router();

// GET /api/v1/products/legacy â€” old hardcoded catalog
router.get('/legacy', auth.repOrAbove, (req: Request, res: Response) => {
  const data = productsService.catalog();
  res.json({ success: true, data });
});

// GET /api/v1/products/categories
router.get('/categories', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await productsService.getCategories();
  res.json({ success: true, data });
});

// GET /api/v1/products/subcategories
router.get('/subcategories', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await productsService.getSubcategories(req.query.categoryId as string);
  res.json({ success: true, data });
});

// GET /api/v1/products/series
router.get('/series', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await productsService.getSeries(req.query.subcategoryId as string);
  res.json({ success: true, data });
});

// GET /api/v1/products â€” full database catalog
router.get('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const filters = {
    categoryId: req.query.categoryId as string,
    subcategoryId: req.query.subcategoryId as string,
    seriesId: req.query.seriesId as string,
  };
  const data = await productsService.getProducts(filters);
  res.json({ success: true, data });
});

// GET /api/v1/products/:id
router.get('/:id', auth.repOrAbove, (req: Request, res: Response) => {
  const data = productsService.getById((req.params.id as string));
  res.json({ success: true, data });
});

// POST /api/v1/products/calculate â€” price a single window
router.post('/calculate', auth.repOrAbove, (req: Request, res: Response) => {
  const data = productsService.calculateWindowPrice(req.body);
  res.json({ success: true, data });
});

// GET /api/v1/products/financing/options
router.get('/financing/options', auth.repOrAbove, (req: Request, res: Response) => {
  const data = productsService.financingOptions();
  res.json({ success: true, data });
});

// POST /api/v1/products/financing/calculate
router.post('/financing/calculate', auth.repOrAbove, (req: Request, res: Response) => {
  const { principal, finOptionId } = req.body;
  const data = productsService.calculateMonthlyPayment(parseFloat(principal), finOptionId);
  res.json({ success: true, data });
});

export { router as productsRouter };
