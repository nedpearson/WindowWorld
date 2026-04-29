import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircleIcon, ChevronDownIcon, ChevronUpIcon, HomeIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { BoltIcon, SparklesIcon, SwatchIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { api } from '../../api/client';

export function ProductCatalogPage() {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);
  const [activeSeriesId, setActiveSeriesId] = useState<string | null>(null);

  const { data: categories, isLoading: isCatsLoading } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => api.products.getCategories().then(r => r.data || [])
  });

  const { data: subcategories, isLoading: isSubLoading } = useQuery({
    queryKey: ['product-subcategories', activeCategoryId],
    queryFn: () => api.products.getSubcategories({ categoryId: activeCategoryId }).then(r => r.data || []),
    enabled: !!activeCategoryId
  });

  const { data: seriesList, isLoading: isSeriesLoading } = useQuery({
    queryKey: ['product-series', activeSubcategoryId],
    queryFn: () => api.products.getSeries({ subcategoryId: activeSubcategoryId }).then(r => r.data || []),
    enabled: !!activeSubcategoryId
  });

  const { data: products, isLoading: isProdsLoading } = useQuery({
    queryKey: ['products', activeSeriesId],
    queryFn: () => api.products.list({ seriesId: activeSeriesId }).then(r => r.data || []),
    enabled: !!activeSeriesId
  });

  const activeCategory = categories?.find((c: any) => c.id === activeCategoryId);
  const activeSubcategory = subcategories?.find((c: any) => c.id === activeSubcategoryId);
  const activeSeries = seriesList?.find((c: any) => c.id === activeSeriesId);

  const resetFilters = () => {
    setActiveCategoryId(null);
    setActiveSubcategoryId(null);
    setActiveSeriesId(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <SwatchIcon className="h-6 w-6 text-brand-400" /> Exterior Product Catalog
          </h1>
          
          <div className="flex items-center gap-2 mt-2 text-sm text-slate-400 font-medium">
            <button onClick={resetFilters} className="hover:text-white flex items-center gap-1 transition-colors">
              <HomeIcon className="h-4 w-4" /> All Categories
            </button>
            {activeCategory && (
              <>
                <ArrowRightIcon className="h-3 w-3 text-slate-600" />
                <button onClick={() => { setActiveSubcategoryId(null); setActiveSeriesId(null); }} className="hover:text-white transition-colors">
                  {activeCategory.name}
                </button>
              </>
            )}
            {activeSubcategory && (
              <>
                <ArrowRightIcon className="h-3 w-3 text-slate-600" />
                <button onClick={() => setActiveSeriesId(null)} className="hover:text-white transition-colors">
                  {activeSubcategory.name}
                </button>
              </>
            )}
            {activeSeries && (
              <>
                <ArrowRightIcon className="h-3 w-3 text-slate-600" />
                <span className="text-brand-400">{activeSeries.name}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/proposals" className="btn-secondary btn-sm">View Proposals</Link>
          <button className="btn-primary btn-sm"><BoltIcon className="h-4 w-4 mr-1"/> Start Quote</button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* LEVEL 1: CATEGORIES */}
        {!activeCategoryId && (
          <motion.div key="categories" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isCatsLoading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-48 bg-slate-800 rounded-xl animate-pulse" />)
            ) : !categories || categories.length === 0 ? (
              <div className="col-span-3 card p-16 text-center">
                <SwatchIcon className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">No product categories found.</p>
                <p className="text-slate-600 text-sm mt-1">The catalog may still be loading from the server.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="btn-secondary btn-sm mt-4"
                >
                  Retry
                </button>
              </div>
            ) : categories?.map((cat: any) => (
              <div 
                key={cat.id} 
                onClick={() => setActiveCategoryId(cat.id)}
                className="card group cursor-pointer hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10 transition-all overflow-hidden relative"
              >
                <div className="h-32 bg-slate-800 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10" />
                  {cat.slug === 'windows' && <div className="absolute inset-0 bg-blue-500/20" />}
                  {cat.slug === 'doors' && <div className="absolute inset-0 bg-amber-500/20" />}
                  {cat.slug === 'siding' && <div className="absolute inset-0 bg-emerald-500/20" />}
                  <span className="text-4xl relative z-20 mix-blend-overlay opacity-30 font-black tracking-tight">{cat.name.toUpperCase()}</span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-white group-hover:text-brand-400 transition-colors">{cat.name}</h3>
                  <p className="text-sm text-slate-400 mt-1 line-clamp-2">{cat.description || 'View exterior products'}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* LEVEL 2: SUBCATEGORIES */}
        {activeCategoryId && !activeSubcategoryId && (
          <motion.div key="subcats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
               Select {activeCategory?.name} Style
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {isSubLoading ? (
                [...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-800 rounded-xl animate-pulse" />)
              ) : subcategories?.map((sub: any) => (
                <div 
                  key={sub.id}
                  onClick={() => setActiveSubcategoryId(sub.id)}
                  className="card p-5 cursor-pointer hover:bg-slate-800/80 transition-colors border-l-4 border-l-brand-500"
                >
                  <h3 className="font-bold text-white">{sub.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{sub.description || 'Explore products'}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* LEVEL 3: SERIES */}
        {activeSubcategoryId && !activeSeriesId && (
          <motion.div key="series" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h2 className="text-lg font-bold text-white mb-4">Available {activeSubcategory?.name} Series</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {isSeriesLoading ? (
                [...Array(3)].map((_, i) => <div key={i} className="h-64 bg-slate-800 rounded-xl animate-pulse" />)
              ) : seriesList?.map((series: any) => (
                <div key={series.id} className="card flex flex-col">
                  <div className="p-5 flex-1 border-b border-slate-800">
                    <h3 className="text-lg font-bold text-white">{series.name}</h3>
                    <p className="text-sm text-slate-400 mt-2">{series.description}</p>
                  </div>
                  <div className="p-4 bg-slate-800/30">
                    <button 
                      onClick={() => setActiveSeriesId(series.id)}
                      className="btn-primary w-full"
                    >
                      View Products & Pricing
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* LEVEL 4: PRODUCTS */}
        {activeSeriesId && (
          <motion.div key="products" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-lg font-bold text-white">Products in {activeSeries?.name}</h2>
            </div>
            
            <div className="space-y-4">
              {isProdsLoading ? (
                <div className="h-32 bg-slate-800 rounded-xl animate-pulse" />
              ) : products?.length === 0 ? (
                <div className="card p-12 text-center text-slate-500">
                   No specific products found for this series yet.
                </div>
              ) : products?.map((prod: any) => (
                <div key={prod.id} className="card p-5 lg:p-6 flex flex-col lg:flex-row gap-6 relative overflow-hidden">
                  
                  {prod.installIncluded && (
                    <div className="absolute top-4 right-4 text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                      Install Included
                    </div>
                  )}

                  {/* Left: Info */}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">{prod.name}</h3>
                    <div className="text-xs text-brand-400 font-mono mt-1 mb-3">SKU: {prod.sku}</div>
                    
                    <p className="text-sm text-slate-300 leading-relaxed mb-4">
                      {prod.description}
                    </p>

                    {prod.salesNotes && (
                      <div className="mb-4 p-3 bg-brand-500/10 border border-brand-500/20 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <SparklesIcon className="h-4 w-4 text-brand-400" />
                          <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">Rep Pitch Angle</span>
                        </div>
                        <p className="text-sm text-slate-300">{prod.salesNotes}</p>
                      </div>
                    )}
                  </div>

                  {/* Right: Pricing & Actions */}
                  <div className="lg:w-64 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-slate-700/50 pt-4 lg:pt-0 lg:pl-6">
                    <div className="text-xs text-slate-500 uppercase font-semibold">Starting at</div>
                    <div className="text-3xl font-black text-white my-1">
                      ${prod.basePrice?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-500 mb-4">
                      {activeCategory?.slug === 'siding' ? 'per sq ft' : 'base unit'}
                    </div>

                    <button className="btn-primary w-full mb-2">Add to Quote</button>
                    <button className="btn-secondary w-full text-xs">View Full Specs</button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
