import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  CheckCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { BoltIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

// ── Product catalog data ───────────────────────────────────────
const WINDOW_SERIES = [
  { id: 'SERIES_2000', name: 'Series 2000', tagline: 'Builder Grade', basePrice: 189, badge: null, color: 'slate', description: 'Standard vinyl single-hung. Energy-efficient, solid construction, great for budget-conscious buyers.', features: ['Single-hung operation', 'Vinyl frame', 'Energy Star® certified', 'Standard screen included', 'Lifetime limited warranty'], bestFor: 'Budget-conscious homeowners, rental properties' },
  { id: 'SERIES_3000', name: 'Series 3000', tagline: 'Mid-Range', basePrice: 239, badge: null, color: 'blue', description: 'Mid-range vinyl double-hung with Low-E glass for improved energy performance.', features: ['Double-hung operation', 'Low-E glass included', 'Easy-tilt sashes for cleaning', 'Standard screen included', 'Lifetime warranty'], bestFor: 'Standard replacement, good value upgrade' },
  { id: 'SERIES_4000', name: 'Series 4000', tagline: 'Best Seller ⭐', basePrice: 299, badge: 'POPULAR', color: 'brand', description: 'Premium vinyl double-hung. Triple Low-E glass, argon fill, superior energy savings. #1 seller in Louisiana.', features: ['Double-hung operation', 'Triple Low-E glass', 'Argon gas fill', 'Easy-clean tilt sashes', 'Premium hardware', 'Lifetime transferable warranty'], bestFor: 'Most homeowners — best value for energy savings' },
  { id: 'SERIES_6000', name: 'Series 6000', tagline: 'Impact Rated', basePrice: 399, badge: 'HURRICANE', color: 'purple', description: 'Ultra-premium, impact-rated windows. Meets Louisiana hurricane zone building codes. Built for coastal and high-wind areas.', features: ['Impact glass (hurricane rated)', 'Meets Florida & Louisiana codes', 'Triple Low-E + argon', 'Superior sound reduction', 'Ideal for coastal parishes', 'Lifetime warranty'], bestFor: 'Jefferson, St. Tammany, Terrebonne, coastal parishes' },
  { id: 'SERIES_CASEMENT', name: 'Casement', tagline: 'Premium Ventilation', basePrice: 349, badge: null, color: 'cyan', description: 'Outswing casement with wide-angle opening. Maximum airflow, crank handle operation.', features: ['Crank-operated outswing', 'Full opening for ventilation', 'Low-E glass', 'Multi-point locking', 'Screen included'], bestFor: 'Kitchens, hard-to-reach locations' },
  { id: 'SERIES_AWNING', name: 'Awning', tagline: 'Rain-Ready Ventilation', basePrice: 319, badge: null, color: 'cyan', description: 'Top-hinged outswing. Can remain open during rain, excellent for bathrooms and basements.', features: ['Top-hinged outswing', 'Open in light rain', 'Low-E glass', 'Screen included', 'Crank operation'], bestFor: 'Bathrooms, basements, combined with picture windows' },
  { id: 'SERIES_SLIDER', name: 'Horizontal Slider', tagline: 'Easy Operation', basePrice: 229, badge: null, color: 'slate', description: 'Two or three-lite horizontal slider. Easy operation, great for low openings.', features: ['Horizontal sliding operation', 'Low-profile frame', 'Removable sash for cleaning', 'Standard screen'], bestFor: 'Wide, low openings, garages, bedrooms' },
  { id: 'SERIES_PICTURE', name: 'Picture (Fixed)', tagline: 'Maximum Light', basePrice: 189, badge: null, color: 'slate', description: 'Non-operable fixed window. Maximum light, no draft, pairs well with casements.', features: ['Non-operable (no ventilation)', 'Maximum glass area', 'Low-E glass', 'Pairs with casement/awning', 'No screen needed'], bestFor: 'Living rooms, large open walls, view windows' },
  { id: 'SERIES_BAY', name: 'Bay Window', tagline: 'Dramatic Statement', basePrice: 899, badge: null, color: 'amber', description: 'Three-window bay unit projecting outward. Creates extra interior space and dramatic exterior presence.', features: ['Three-window angled unit', '30° or 45° projection', 'Includes seat board option', 'Custom sizing available', 'All-inclusive install'], bestFor: 'Living rooms, dining areas, master bedrooms' },
  { id: 'SERIES_BOW', name: 'Bow Window', tagline: 'Panoramic View', basePrice: 1199, badge: null, color: 'amber', description: 'Four or five-lite curved bow unit. Maximum panoramic view, elegant exterior appearance.', features: ['4 or 5-lite curved bow', 'Elegant curved appearance', 'Custom sizing', 'Seat board option', 'Premium hardware'], bestFor: 'Living rooms, dining rooms, maximum curb appeal' },
];

const OPTIONS = [
  { id: 'ARGON_FILL', name: 'Argon Gas Fill', price: 25, category: 'glass', tooltip: 'Inert gas fill improves thermal insulation by ~15%' },
  { id: 'TRIPLE_PANE', name: 'Triple Pane', price: 89, category: 'glass', tooltip: 'Three layers of glass — maximum insulation, best for high-humidity Louisiana climates' },
  { id: 'IMPACT', name: 'Impact Glass', price: 125, category: 'glass', tooltip: 'Hurricane impact rated — meets Louisiana coastal building codes' },
  { id: 'OBSCURE', name: 'Obscure/Privacy Glass', price: 35, category: 'glass', tooltip: 'Frosted or patterned glass for privacy' },
  { id: 'TINTED', name: 'Solar Tint', price: 25, category: 'glass', tooltip: 'Reduces heat gain and UV — great for South-facing windows in Louisiana' },
  { id: 'GRIDS_COLONIAL', name: 'Colonial Grids', price: 28, category: 'grids', tooltip: 'Classic colonial divided-lite appearance' },
  { id: 'GRIDS_PRAIRIE', name: 'Prairie Grids', price: 32, category: 'grids', tooltip: 'Prairie-style perimeter grid pattern' },
  { id: 'GRIDS_CRAFTSMAN', name: 'Craftsman Grids', price: 35, category: 'grids', tooltip: 'Craftsman top-bar grid, popular in historic Baton Rouge neighborhoods' },
  { id: 'SCREEN_SOLAR', name: 'Solar Screen Upgrade', price: 45, category: 'screen', tooltip: 'Solar screens block 70-80% of heat before it hits the glass — significant energy savings in Louisiana' },
  { id: 'COLOR_TAN', name: 'Tan Frame', price: 15, category: 'color', tooltip: 'Premium frame color, matches many brick/stucco exteriors' },
  { id: 'COLOR_BROWN', name: 'Brown Frame', price: 15, category: 'color', tooltip: 'Earth-tone frame, popular in wooded settings' },
  { id: 'COLOR_BLACK', name: 'Black Interior Frame', price: 25, category: 'color', tooltip: 'Modern/contemporary look — trending in Lafayette and Baton Rouge' },
  { id: 'INSTALL_PERMIT', name: 'Permit Fee', price: 45, category: 'install', tooltip: 'Building permit where required by local jurisdiction' },
  { id: 'INSTALL_HAUL', name: 'Old Window Removal', price: 25, category: 'install', tooltip: 'Full removal and disposal per window' },
];

const SERIES_BADGE_COLORS: Record<string, string> = {
  POPULAR: 'bg-brand-600 text-white',
  HURRICANE: 'bg-purple-600 text-white' };

const CARD_ACCENT: Record<string, string> = {
  slate: 'border-t-slate-500',
  blue: 'border-t-blue-500',
  brand: 'border-t-brand-500',
  purple: 'border-t-purple-500',
  cyan: 'border-t-cyan-500',
  amber: 'border-t-amber-500' };

type View = 'catalog' | 'options' | 'compare';

export function ProductCatalogPage() {
  const [view, setView] = useState<View>('catalog');
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set(['INSTALL_STANDARD']));
  const [windowWidth, setWindowWidth] = useState('35.75');
  const [windowHeight, setWindowHeight] = useState('47.75');
  const [quantity, setQuantity] = useState(9);
  const [expandedId, setExpandedId] = useState<string | null>('SERIES_4000');
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());

  const toggleOption = (id: string) => {
    setSelectedOptions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); return next; }
      if (next.size >= 3) { toast.info('Compare up to 3 products'); return prev; }
      next.add(id);
      return next;
    });
  };

  const w = parseFloat(windowWidth) || 36;
  const h = parseFloat(windowHeight) || 48;
  const sqFt = ((w * h) / 144).toFixed(1);

  // Calculate price for selected config
  const calcPrice = (seriesId: string) => {
    const series = WINDOW_SERIES.find((s) => s.id === seriesId);
    if (!series) return { unit: 0, total: 0 };
    const sqFtNum = (w * h) / 144;
    const optPrices: Record<string, number> = { SERIES_2000: 0, SERIES_3000: 0.22, SERIES_4000: 0.28, SERIES_6000: 0.35, SERIES_CASEMENT: 0.30, SERIES_AWNING: 0.27, SERIES_SLIDER: 0.20, SERIES_PICTURE: 0.18, SERIES_BAY: 0, SERIES_BOW: 0 };
    let unit = Math.max(series.basePrice + (optPrices[seriesId] || 0) * sqFtNum * 144, series.basePrice);

    const includedOpts: Record<string, string[]> = {
      LOW_E: ['SERIES_3000', 'SERIES_4000', 'SERIES_6000'], ARGON_FILL: ['SERIES_4000', 'SERIES_6000'], IMPACT: ['SERIES_6000'],
      SCREEN_STANDARD: ['SERIES_2000', 'SERIES_3000', 'SERIES_4000', 'SERIES_6000', 'SERIES_CASEMENT', 'SERIES_AWNING', 'SERIES_SLIDER'] };

    let extras = 75; // install
    for (const optId of selectedOptions) {
      const opt = OPTIONS.find((o) => o.id === optId);
      if (opt && !includedOpts[optId]?.includes(seriesId)) extras += opt.price;
    }

    unit = Math.round((unit + extras) * 100) / 100;
    return { unit, total: Math.round(unit * quantity * 100) / 100 };
  };

  const compareList = WINDOW_SERIES.filter((s) => compareIds.has(s.id));

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Product Catalog</h1>
          <p className="text-slate-500 text-sm mt-0.5">WindowWorld Louisiana — Window series &amp; pricing</p>
        </div>
        <div className="flex items-center gap-2">
          {(['catalog', 'options', 'compare'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={clsx('btn-sm capitalize', view === v ? 'btn-primary' : 'btn-secondary')}
            >
              {v}
              {v === 'compare' && compareIds.size > 0 && (
                <span className="ml-1.5 bg-brand-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{compareIds.size}</span>
              )}
            </button>
          ))}
          <Link to="/proposals" className="btn-secondary btn-sm">All Proposals</Link>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* CATALOG VIEW */}
        {view === 'catalog' && (
          <motion.div key="catalog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Quick price calculator */}
            <div className="card p-4 bg-gradient-to-r from-brand-950/30 to-slate-800/50 border-brand-600/20">
              <div className="flex items-center gap-2 mb-3">
                <BoltIcon className="h-4 w-4 text-brand-400" />
                <span className="text-sm font-semibold text-white">Live Price Calculator</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="label">Width (inches)</label>
                  <input value={windowWidth} onChange={(e) => setWindowWidth(e.target.value)}
                    type="number" step="0.125" className="input font-mono" />
                </div>
                <div>
                  <label className="label">Height (inches)</label>
                  <input value={windowHeight} onChange={(e) => setWindowHeight(e.target.value)}
                    type="number" step="0.125" className="input font-mono" />
                </div>
                <div>
                  <label className="label">Quantity</label>
                  <input value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    type="number" min="1" className="input" />
                </div>
                <div>
                  <label className="label">Sq Ft</label>
                  <div className="input flex items-center text-slate-400 font-mono bg-slate-800/50">{sqFt} sq ft</div>
                </div>
              </div>
            </div>

            {/* Series cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {WINDOW_SERIES.map((series) => {
                const price = calcPrice(series.id);
                const isExpanded = expandedId === series.id;
                const isSelected = selectedSeries === series.id;

                return (
                  <motion.div
                    key={series.id}
                    layout
                    className={clsx(
                      'card border-t-4 cursor-pointer transition-all flex flex-col',
                      CARD_ACCENT[series.color] || 'border-t-slate-500',
                      isSelected ? 'ring-2 ring-brand-500/50' : 'hover:border-slate-600/50',
                    )}
                  >
                    <div className="p-4 flex-1" onClick={() => setExpandedId(isExpanded ? null : series.id)}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{series.name}</span>
                            {series.badge && (
                              <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-semibold', SERIES_BADGE_COLORS[series.badge])}>
                                {series.badge}
                              </span>
                            )}
                            {series.id === 'SERIES_4000' && <BoltIcon className="h-3.5 w-3.5 text-brand-400" />}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">{series.tagline}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">${price.unit.toFixed(0)}</div>
                          <div className="text-[10px] text-slate-500">per window</div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed mb-3">{series.description}</p>

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-emerald-400 font-semibold">
                          {quantity > 1 && `${quantity} windows: $${price.total.toLocaleString()}`}
                        </div>
                        {isExpanded ? (
                          <ChevronUpIcon className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-slate-700/50"
                        >
                          <div className="p-4 space-y-3">
                            {/* Features */}
                            <div className="space-y-1.5">
                              {series.features.map((f) => (
                                <div key={f} className="flex items-center gap-2 text-xs text-slate-300">
                                  <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                                  {f}
                                </div>
                              ))}
                            </div>
                            <div className="text-xs text-slate-600">
                              <span className="font-medium text-slate-500">Best for:</span> {series.bestFor}
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => { setSelectedSeries(series.id); toast.success(`${series.name} selected`); }}
                                className={clsx('flex-1 btn-sm', isSelected ? 'btn-success' : 'btn-primary')}
                              >
                                {isSelected ? '✓ Selected' : 'Select Series'}
                              </button>
                              <button
                                onClick={() => toggleCompare(series.id)}
                                className={clsx('btn-sm', compareIds.has(series.id) ? 'btn-secondary' : 'btn-ghost')}
                              >
                                {compareIds.has(series.id) ? 'Comparing' : 'Compare'}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* OPTIONS VIEW */}
        {view === 'options' && (
          <motion.div key="options" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <p className="text-sm text-slate-400">Select add-on options to apply to your quote. Prices are per window per option.</p>
            {['glass', 'grids', 'screen', 'color', 'install'].map((category) => {
              const catOptions = OPTIONS.filter((o) => o.category === category);
              return (
                <div key={category} className="card p-5">
                  <h2 className="text-sm font-semibold text-white capitalize mb-3">{category === 'glass' ? 'Glass Upgrades' : category === 'grids' ? 'Grid Styles' : category === 'screen' ? 'Screen Upgrades' : category === 'color' ? 'Frame Colors' : 'Installation'}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {catOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => toggleOption(opt.id)}
                        className={clsx(
                          'flex items-center justify-between p-3 rounded-xl border text-left transition-all',
                          selectedOptions.has(opt.id)
                            ? 'border-brand-500/50 bg-brand-600/10 text-brand-200'
                            : 'border-slate-700/50 bg-slate-800/40 text-slate-300 hover:border-slate-600'
                        )}
                      >
                        <div>
                          <div className="text-sm font-medium">{opt.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5 leading-tight">{opt.tooltip}</div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <div className={clsx('text-sm font-bold', selectedOptions.has(opt.id) ? 'text-brand-400' : 'text-slate-400')}>
                            {opt.price === 0 ? 'Included' : `+$${opt.price}`}
                          </div>
                          {selectedOptions.has(opt.id) && quantity > 1 && (
                            <div className="text-[10px] text-slate-500">=${(opt.price * quantity).toLocaleString()} total</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-emerald-300">Option extras total</div>
                <div className="text-lg font-bold text-emerald-400">
                  ${Array.from(selectedOptions).reduce((s, id) => {
                    const opt = OPTIONS.find((o) => o.id === id);
                    return s + (opt?.price || 0);
                  }, 0)}/window
                </div>
              </div>
              {quantity > 1 && (
                <div className="text-xs text-emerald-600 mt-0.5">
                  ${Array.from(selectedOptions).reduce((s, id) => s + (OPTIONS.find((o) => o.id === id)?.price || 0), 0) * quantity} total for {quantity} windows
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* COMPARE VIEW */}
        {view === 'compare' && (
          <motion.div key="compare" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {compareList.length < 2 ? (
              <div className="card p-8 text-center">
                <p className="text-slate-500 mb-3">Select 2–3 products from the catalog to compare</p>
                <button onClick={() => setView('catalog')} className="btn-primary btn-sm">Browse Catalog →</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table min-w-full">
                  <thead>
                    <tr>
                      <th className="w-40">Feature</th>
                      {compareList.map((s) => (
                        <th key={s.id} className="text-center">
                          <div>{s.name}</div>
                          <div className="text-brand-400 font-mono">${calcPrice(s.id).unit.toFixed(0)}/window</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Base Price', ...compareList.map((s) => `$${s.basePrice}`)],
                      ['Tagline', ...compareList.map((s) => s.tagline)],
                      ['Double-Hung', ...compareList.map((s) => s.features.some((f) => f.includes('Double') ) ? '✅' : '—')],
                      ['Low-E Glass', ...compareList.map((s) => ['SERIES_3000','SERIES_4000','SERIES_6000'].includes(s.id) ? '✅ Included' : '—')],
                      ['Argon Fill', ...compareList.map((s) => ['SERIES_4000','SERIES_6000'].includes(s.id) ? '✅ Included' : '—')],
                      ['Impact Rated', ...compareList.map((s) => s.id === 'SERIES_6000' ? '✅' : '—')],
                      ['Best For', ...compareList.map((s) => s.bestFor)],
                      [`${quantity} windows`, ...compareList.map((s) => `$${calcPrice(s.id).total.toLocaleString()}`)],
                    ].map(([label, ...vals]) => (
                      <tr key={String(label)}>
                        <td className="font-medium text-slate-400 text-xs">{label}</td>
                        {vals.map((v, i) => (
                          <td key={i} className="text-center text-sm">
                            {String(v).startsWith('$') ? <span className="font-bold text-white">{v}</span> : v}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <td />
                      {compareList.map((s) => (
                        <td key={s.id} className="text-center py-3">
                          <button
                            onClick={() => { setSelectedSeries(s.id); toast.success(`${s.name} selected`); }}
                            className="btn-primary btn-sm"
                          >
                            Select {s.name}
                          </button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
