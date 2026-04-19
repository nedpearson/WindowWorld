import { prisma } from '../../shared/services/prisma';
import { NotFoundError } from '../../shared/middleware/errorHandler';

// ─── Louisiana window series pricing (realistic Window World pricing) ──
export const WINDOW_SERIES = {
  'SERIES_2000': { name: 'Series 2000', description: 'Standard vinyl single-hung, energy-efficient, builder grade', basePrice: 189, pricePerSqFt: 0, minPrice: 189 },
  'SERIES_3000': { name: 'Series 3000', description: 'Mid-range vinyl double-hung with Low-E glass', basePrice: 239, pricePerSqFt: 0.22, minPrice: 239 },
  'SERIES_4000': { name: 'Series 4000', description: 'Premium vinyl double-hung, triple Low-E, argon fill, best sellers', basePrice: 299, pricePerSqFt: 0.28, minPrice: 289 },
  'SERIES_6000': { name: 'Series 6000', description: 'Ultra-premium, impact-rated, hurricane zone ready', basePrice: 399, pricePerSqFt: 0.35, minPrice: 379 },
  'SERIES_CASEMENT': { name: 'Casement', description: 'Outswing casement, premium hardware', basePrice: 349, pricePerSqFt: 0.30, minPrice: 339 },
  'SERIES_AWNING': { name: 'Awning', description: 'Top-hinged awning window', basePrice: 319, pricePerSqFt: 0.27, minPrice: 299 },
  'SERIES_SLIDER': { name: 'Horizontal Slider', description: 'Two or three-lite horizontal slider', basePrice: 229, pricePerSqFt: 0.20, minPrice: 219 },
  'SERIES_PICTURE': { name: 'Picture (Fixed)', description: 'Non-operable fixed lite', basePrice: 189, pricePerSqFt: 0.18, minPrice: 179 },
  'SERIES_BAY': { name: 'Bay Window', description: 'Three-window bay unit, custom projection', basePrice: 899, pricePerSqFt: 0, minPrice: 899 },
  'SERIES_BOW': { name: 'Bow Window', description: 'Four or five-lite bow unit', basePrice: 1199, pricePerSqFt: 0, minPrice: 1199 },
};

export const OPTION_PRICES = {
  // Glass
  'LOW_E': { name: 'Low-E Glass', price: 0, included: ['SERIES_3000', 'SERIES_4000', 'SERIES_6000'] },
  'ARGON_FILL': { name: 'Argon Gas Fill', price: 25, included: ['SERIES_4000', 'SERIES_6000'] },
  'TRIPLE_PANE': { name: 'Triple Pane', price: 89, included: [] },
  'IMPACT': { name: 'Impact Glass (Hurricane)', price: 125, included: ['SERIES_6000'] },
  'OBSCURE': { name: 'Obscure / Privacy Glass', price: 35, included: [] },
  'TINTED': { name: 'Solar Tint', price: 25, included: [] },
  // Grids
  'GRIDS_COLONIAL': { name: 'Colonial Grids', price: 28, included: [] },
  'GRIDS_PRAIRIE': { name: 'Prairie Grids', price: 32, included: [] },
  'GRIDS_CRAFTSMAN': { name: 'Craftsman Grids', price: 35, included: [] },
  // Screen
  'SCREEN_STANDARD': { name: 'Standard Screen', price: 0, included: ['SERIES_2000', 'SERIES_3000', 'SERIES_4000', 'SERIES_6000', 'SERIES_CASEMENT', 'SERIES_AWNING', 'SERIES_SLIDER'] },
  'SCREEN_SOLAR': { name: 'Solar Screen', price: 45, included: [] },
  // Color
  'COLOR_WHITE': { name: 'White (Standard)', price: 0, included: [] },
  'COLOR_TAN': { name: 'Tan', price: 15, included: [] },
  'COLOR_BROWN': { name: 'Brown', price: 15, included: [] },
  'COLOR_BLACK': { name: 'Black (Interior)', price: 25, included: [] },
  // Installation
  'INSTALL_STANDARD': { name: 'Standard Installation', price: 75, included: [] },
  'INSTALL_PERMIT': { name: 'Permit Fee (Est.)', price: 45, included: [] },
  'INSTALL_HAUL': { name: 'Old Window Haul-Away', price: 25, included: [] },
};

export const FINANCING_OPTIONS = [
  { id: 'SAME_AS_CASH_12', label: '12 Months Same-As-Cash', months: 12, aprPct: 0, minAmount: 1000 },
  { id: 'SAME_AS_CASH_18', label: '18 Months Same-As-Cash', months: 18, aprPct: 0, minAmount: 2500 },
  { id: 'FIXED_60', label: '60-Month Fixed (9.9% APR)', months: 60, aprPct: 9.9, minAmount: 1000 },
  { id: 'FIXED_120', label: '120-Month Fixed (11.9% APR)', months: 120, aprPct: 11.9, minAmount: 3000 },
];

export class ProductsService {
  catalog() {
    return Object.entries(WINDOW_SERIES).map(([id, product]) => ({
      id,
      ...product,
      options: Object.entries(OPTION_PRICES)
        .filter(([, opt]) => opt.included.includes(id))
        .map(([optId, opt]) => ({ id: optId, name: opt.name, price: opt.price, included: true })),
    }));
  }

  getById(id: string) {
    const product = WINDOW_SERIES[id as keyof typeof WINDOW_SERIES];
    if (!product) throw new NotFoundError('Product');
    return { id, ...product, allOptions: OPTION_PRICES };
  }

  /**
   * Calculate price for a single window opening
   * Width × Height are in inches (rough opening)
   */
  calculateWindowPrice(params: {
    seriesId: string;
    widthInches: number;
    heightInches: number;
    options?: string[];
    quantity?: number;
  }) {
    const { seriesId, widthInches, heightInches, options = [], quantity = 1 } = params;
    const series = WINDOW_SERIES[seriesId as keyof typeof WINDOW_SERIES];
    if (!series) throw new NotFoundError('Product series');

    const sqFt = (widthInches * heightInches) / 144;
    let unitPrice = Math.max(series.basePrice + (series.pricePerSqFt * sqFt * 144), series.minPrice);

    // Add option prices
    let optionTotal = 0;
    const appliedOptions: Array<{ id: string; name: string; price: number }> = [];

    for (const optId of options) {
      const opt = OPTION_PRICES[optId as keyof typeof OPTION_PRICES];
      if (opt && !opt.included.includes(seriesId)) {
        optionTotal += opt.price;
        appliedOptions.push({ id: optId, name: opt.name, price: opt.price });
      } else if (opt) {
        appliedOptions.push({ id: optId, name: opt.name, price: 0 });
      }
    }

    // Installation (always applied per window)
    const installOption = OPTION_PRICES['INSTALL_STANDARD'];
    optionTotal += installOption.price;
    appliedOptions.push({ id: 'INSTALL_STANDARD', name: installOption.name, price: installOption.price });

    const lineTotal = (unitPrice + optionTotal) * quantity;

    return {
      seriesId,
      seriesName: series.name,
      widthInches,
      heightInches,
      sqFt: Math.round(sqFt * 100) / 100,
      unitPrice: Math.round(unitPrice * 100) / 100,
      optionTotal: Math.round(optionTotal * 100) / 100,
      pricePerWindow: Math.round((unitPrice + optionTotal) * 100) / 100,
      quantity,
      lineTotal: Math.round(lineTotal * 100) / 100,
      appliedOptions,
    };
  }

  calculateMonthlyPayment(principal: number, finOptionId: string) {
    const option = FINANCING_OPTIONS.find((f) => f.id === finOptionId);
    if (!option) throw new NotFoundError('Financing option');

    if (option.aprPct === 0) {
      return {
        optionId: finOptionId,
        label: option.label,
        monthlyPayment: Math.round((principal / option.months) * 100) / 100,
        totalCost: principal,
        totalInterest: 0,
        months: option.months,
      };
    }

    const monthlyRate = option.aprPct / 100 / 12;
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, option.months)) /
      (Math.pow(1 + monthlyRate, option.months) - 1);
    const totalCost = payment * option.months;

    return {
      optionId: finOptionId,
      label: option.label,
      monthlyPayment: Math.round(payment * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalInterest: Math.round((totalCost - principal) * 100) / 100,
      months: option.months,
    };
  }

  financingOptions() {
    return FINANCING_OPTIONS;
  }
}

export const productsService = new ProductsService();
