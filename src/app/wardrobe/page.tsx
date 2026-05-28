'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Navigation from '@/components/Navigation';
import { 
  Shirt, Plus, Compass, Search, Filter, ArrowUpDown, 
  Star, Heart, HelpCircle, Sparkles, Loader2, Award, 
  X, Check, PlusCircle, Calendar, Coins, ArrowRight 
} from 'lucide-react';
import { GarmentItem } from '@/lib/types';

export default function WardrobePage() {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<GarmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [onlyGrails, setOnlyGrails] = useState(false);
  const [onlyNatural, setOnlyNatural] = useState(false);
  const [onlyUnworn, setOnlyUnworn] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState<string>('recent');

  // Quick Action States
  const [loggingWearId, setLoggingWearId] = useState<string | null>(null);

  // AI Archival Advisor Modal States
  const [advisingGarment, setAdvisingGarment] = useState<GarmentItem | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceResult, setAdviceResult] = useState<{
    recommendation: 'STYLE' | 'SELL' | 'DONATE';
    resaleValueRange: string;
    explanation: string;
    outfitIdea: string;
  } | null>(null);

  useEffect(() => {
    async function fetchGarments() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          router.push('/login');
          return;
        }

        const { data, error } = await supabase
          .from('garments')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setItems(data || []);
      } catch (err) {
        console.error('Error fetching garments:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGarments();
  }, [supabase, router]);

  // Quick Wear Logger Action
  const handleQuickLogWear = async (e: React.MouseEvent, item: GarmentItem) => {
    e.preventDefault();
    e.stopPropagation();

    setLoggingWearId(item.id);
    try {
      const newCount = (item.worn_count || 0) + 1;
      const { error } = await supabase
        .from('garments')
        .update({ worn_count: newCount })
        .eq('id', item.id);

      if (error) throw error;

      setItems(prev =>
        prev.map(g => (g.id === item.id ? { ...g, worn_count: newCount } : g))
      );
    } catch (err: any) {
      console.error('Failed to log wear:', err);
      alert('Could not update wear count: ' + err.message);
    } finally {
      setLoggingWearId(null);
    }
  };

  // AI Archive Advisor Trigger
  const handleOpenAdvisor = async (e: React.MouseEvent, item: GarmentItem) => {
    e.preventDefault();
    e.stopPropagation();

    setAdvisingGarment(item);
    setAdviceLoading(true);
    setAdviceResult(null);

    try {
      const res = await fetch('/api/gemini/archive-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ garment: item }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAdviceResult(data.data);
    } catch (err: any) {
      console.error('Failed to load archival advice:', err);
      alert('Failed to get AI assessment: ' + err.message);
      setAdvisingGarment(null);
    } finally {
      setAdviceLoading(false);
    }
  };

  // Dynamic values
  const categories = ['all', 'tops', 'bottoms', 'footwear', 'shoes', 'accessories'];
  
  // Extract unique tags/capsules
  const allTags = Array.from(
    new Set(items.flatMap(item => item.tags || []))
  ).filter(Boolean);

  // CPW Utility
  const getCPW = (item: GarmentItem) => {
    if (!item.purchase_price) return null;
    const wears = Math.max(1, item.worn_count);
    return item.purchase_price / wears;
  };

  // Search & Filter computation
  const filteredItems = items
    .filter((item) => {
      // 1. Text Search
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesBrand = item.brand?.toLowerCase().includes(query);
        const matchesSubcat = item.subcategory?.toLowerCase().includes(query);
        const matchesCat = item.category.toLowerCase().includes(query);
        const matchesEra = item.era?.toLowerCase().includes(query);
        const matchesFabrics = item.fabrics?.some(f => f.toLowerCase().includes(query));
        const matchesColors = item.colours?.some(c => c.toLowerCase().includes(query));
        const matchesNotes = item.notes?.toLowerCase().includes(query);

        if (!matchesBrand && !matchesSubcat && !matchesCat && !matchesEra && !matchesFabrics && !matchesColors && !matchesNotes) {
          return false;
        }
      }

      // 2. Category Tab Filter
      if (selectedCategory !== 'all') {
        // support footwear/shoes mapping
        if (selectedCategory === 'footwear' || selectedCategory === 'shoes') {
          if (item.category !== 'footwear' && item.category !== 'shoes') return false;
        } else if (item.category !== selectedCategory) {
          return false;
        }
      }

      // 3. Capsule Tag Filter
      if (selectedTag !== 'all') {
        if (!item.tags?.includes(selectedTag)) return false;
      }

      // 4. Smart Filters
      if (onlyGrails && !item.is_grail) return false;
      if (onlyNatural && !item.is_natural_fibre) return false;
      if (onlyUnworn && item.worn_count > 0) return false;

      return true;
    })
    .sort((a, b) => {
      // 5. Sorting
      if (sortBy === 'recent') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'worn-desc') {
        return (b.worn_count || 0) - (a.worn_count || 0);
      }
      if (sortBy === 'worn-asc') {
        return (a.worn_count || 0) - (b.worn_count || 0);
      }
      if (sortBy === 'price-desc') {
        const priceA = a.purchase_price || 0;
        const priceB = b.purchase_price || 0;
        return priceB - priceA;
      }
      if (sortBy === 'price-asc') {
        const priceA = a.purchase_price || 999999;
        const priceB = b.purchase_price || 999999;
        return priceA - priceB;
      }
      if (sortBy === 'cpw-desc') {
        const cpwA = getCPW(a) || 0;
        const cpwB = getCPW(b) || 0;
        return cpwB - cpwA;
      }
      if (sortBy === 'cpw-asc') {
        const cpwA = getCPW(a) || 999999;
        const cpwB = getCPW(b) || 999999;
        return cpwA - cpwB;
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1814] text-[#f5f0e8] flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 text-[#c9a96e] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1814] text-[#f5f0e8] flex flex-col">
      <Navigation />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-[#c9a96e]/10 pb-6 mb-8">
          <div>
            <h2 className="font-serif text-xs uppercase tracking-widest text-[#8a8070] mb-2">
              Personal Collection
            </h2>
            <h1 className="font-serif text-4xl sm:text-5xl font-light tracking-wide text-[#f5f0e8]">
              The Wardrobe
            </h1>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center gap-4">
            <span className="font-serif text-sm italic text-[#8a8070]">
              {filteredItems.length} {filteredItems.length === 1 ? 'garment' : 'garments'} displayed
            </span>
            <Link
              href="/wardrobe/upload"
              className="inline-flex items-center gap-2 border border-[#c9a96e] bg-[#c9a96e] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#1a1814] transition-all hover:bg-transparent hover:text-[#c9a96e] rounded-sm"
            >
              <Plus className="h-4 w-4" />
              Add Garment
            </Link>
          </div>
        </div>

        {items.length === 0 ? (
          /* Empty Closet */
          <div className="flex flex-col items-center justify-center border border-dashed border-[#c9a96e]/20 bg-[#252118] py-20 px-4 text-center rounded-sm">
            <Shirt className="h-12 w-12 text-[#8a8070] mb-4 stroke-[1.25]" />
            <h2 className="font-serif text-xl text-[#f5f0e8] mb-2">Your closet is empty</h2>
            <p className="text-sm text-[#8a8070] max-w-sm mb-6">
              Start by uploading photos of your garments. Gemini will automatically extract fabrics, brands, and eras.
            </p>
            <Link
              href="/wardrobe/upload"
              className="inline-flex items-center gap-2 border border-[#c9a96e] bg-transparent px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#c9a96e] transition-all hover:bg-[#c9a96e] hover:text-[#1a1814] rounded-sm"
            >
              Upload First Garment
            </Link>
          </div>
        ) : (
          /* Collection Manager Dashboard */
          <div className="space-y-8">
            
            {/* Search, Filter Tabs, and Controls */}
            <div className="bg-[#252118] border border-[#c9a96e]/10 p-5 rounded-sm">
              
              {/* Row 1: Search, Sort, and Filters Toggle */}
              <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                
                {/* Search input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-[#8a8070]/60" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search closet by brand, fabric, era..."
                    className="block w-full border border-[#c9a96e]/20 bg-[#1a1814] pl-11 pr-4 py-2.5 text-sm text-[#f5f0e8] placeholder-[#8a8070]/40 outline-none focus:border-[#c9a96e] rounded-sm"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3.5 text-[#8a8070] hover:text-[#f5f0e8] cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Sort selector */}
                <div className="relative flex items-center min-w-[160px]">
                  <ArrowUpDown className="absolute left-3.5 h-4.5 w-4.5 text-[#8a8070]/60 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="block w-full border border-[#c9a96e]/20 bg-[#1a1814] pl-11 pr-8 py-2.5 text-sm text-[#f5f0e8] outline-none focus:border-[#c9a96e] rounded-sm cursor-pointer appearance-none"
                  >
                    <option value="recent">Recently Added</option>
                    <option value="worn-desc">Worn: Most</option>
                    <option value="worn-asc">Worn: Least</option>
                    <option value="price-desc">Price: High-Low</option>
                    <option value="price-asc">Price: Low-High</option>
                    <option value="cpw-asc">CPW: Low-High</option>
                    <option value="cpw-desc">CPW: High-Low</option>
                  </select>
                </div>

                {/* Toggle Filter Panel */}
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center justify-center gap-2 border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                    showFilters || selectedCategory !== 'all' || selectedTag !== 'all' || onlyGrails || onlyNatural || onlyUnworn
                      ? 'border-[#c9a96e] text-[#c9a96e] bg-[#c9a96e]/5'
                      : 'border-[#c9a96e]/20 bg-[#1a1814] text-[#8a8070] hover:border-[#c9a96e]/40 hover:text-[#f5f0e8]'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {(selectedCategory !== 'all' || selectedTag !== 'all' || onlyGrails || onlyNatural || onlyUnworn) && (
                    <span className="w-2 h-2 rounded-full bg-[#c9a96e]" />
                  )}
                </button>
              </div>

              {/* Collapsible Filters Drawer */}
              {showFilters && (
                <div className="border-t border-[#c9a96e]/10 pt-5 mt-5 space-y-5 animate-fade-in">
                  
                  {/* Category Filter */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8070]">
                      Categories
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-sm border transition-all cursor-pointer ${
                            selectedCategory === cat
                              ? 'border-[#c9a96e] bg-[#c9a96e] text-[#1a1814]'
                              : 'border-[#c9a96e]/10 bg-[#1a1814]/40 text-[#8a8070] hover:border-[#c9a96e]/30 hover:text-[#f5f0e8]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tag Selection Pills */}
                  {allTags.length > 0 && (
                    <div className="space-y-2 border-t border-[#c9a96e]/5 pt-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8070] block">
                        Capsules / Collections
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setSelectedTag('all')}
                          className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-sm border transition-all cursor-pointer ${
                            selectedTag === 'all'
                              ? 'border-[#c9a96e] bg-[#c9a96e]/10 text-[#c9a96e]'
                              : 'border-transparent bg-[#1a1814] text-[#8a8070] hover:text-[#f5f0e8]'
                          }`}
                        >
                          All
                        </button>
                        {allTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setSelectedTag(tag)}
                            className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-sm border transition-all cursor-pointer flex items-center gap-1 ${
                              selectedTag === tag
                                ? 'border-[#c9a96e] bg-[#c9a96e]/15 text-[#c9a96e]'
                                : 'border-[#c9a96e]/10 bg-[#1a1814]/60 text-[#8a8070] hover:border-[#c9a96e]/30 hover:text-[#f5f0e8]'
                            }`}
                          >
                            <span className="text-[#c9a96e]/60 font-mono">#</span>
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Smart Filters Checklist */}
                  <div className="space-y-2 border-t border-[#c9a96e]/5 pt-4">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8070] block">
                      Smart Toggles
                    </span>
                    <div className="flex flex-wrap gap-6 text-xs select-none">
                      {/* Pinned Grails filter */}
                      <label className="flex items-center gap-2.5 cursor-pointer text-[#8a8070] hover:text-[#f5f0e8] transition-colors">
                        <input
                          type="checkbox"
                          checked={onlyGrails}
                          onChange={(e) => setOnlyGrails(e.target.checked)}
                          className="rounded border-[#c9a96e]/20 bg-[#1a1814] text-[#c9a96e] focus:ring-0 focus:ring-offset-0 h-4 w-4 cursor-pointer"
                        />
                        <span className="flex items-center gap-1">
                          <Star className={`h-3.5 w-3.5 ${onlyGrails ? 'text-[#c9a96e] fill-[#c9a96e]' : ''}`} />
                          Grail Finds Only
                        </span>
                      </label>

                      {/* Natural fiber filter */}
                      <label className="flex items-center gap-2.5 cursor-pointer text-[#8a8070] hover:text-[#f5f0e8] transition-colors">
                        <input
                          type="checkbox"
                          checked={onlyNatural}
                          onChange={(e) => setOnlyNatural(e.target.checked)}
                          className="rounded border-[#c9a96e]/20 bg-[#1a1814] text-[#c9a96e] focus:ring-0 focus:ring-offset-0 h-4 w-4 cursor-pointer"
                        />
                        <span>100% Natural Fiber</span>
                      </label>

                      {/* Unworn filter */}
                      <label className="flex items-center gap-2.5 cursor-pointer text-[#8a8070] hover:text-[#f5f0e8] transition-colors">
                        <input
                          type="checkbox"
                          checked={onlyUnworn}
                          onChange={(e) => setOnlyUnworn(e.target.checked)}
                          className="rounded border-[#c9a96e]/20 bg-[#1a1814] text-[#c9a96e] focus:ring-0 focus:ring-offset-0 h-4 w-4 cursor-pointer"
                        />
                        <span>Unworn Pieces</span>
                      </label>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Results Grid */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-20 border border-[#c9a96e]/5 bg-[#252118]/40 rounded-sm">
                <p className="text-[#8a8070] text-sm font-serif italic">
                  No garments match your active filters or query. Try resetting filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
                {filteredItems.map((item) => {
                  const cpw = getCPW(item);
                  const isUnworn = !item.worn_count || item.worn_count === 0;

                  return (
                    <Link
                      key={item.id}
                      href={`/wardrobe/${item.id}`}
                      className="group flex flex-col bg-[#252118] border border-[#c9a96e]/10 overflow-hidden hover:border-[#c9a96e]/30 transition-all rounded-sm relative shadow-md"
                    >
                      {/* Photo Container */}
                      <div className="relative aspect-[3/4] bg-[#1a1814] overflow-hidden">
                        {item.image_urls?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_urls[0]}
                            alt={item.subcategory || item.category}
                            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Shirt className="h-8 w-8 text-[#8a8070] stroke-[1]" />
                          </div>
                        )}

                        {/* Floated top tags */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                          {item.is_grail && (
                            <span className="bg-[#c9a96e] text-[#1a1814] text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm flex items-center gap-1 shadow-md">
                              <Star className="h-2.5 w-2.5 fill-[#1a1814]" />
                              Grail
                            </span>
                          )}
                          {item.is_natural_fibre && (
                            <span className="bg-[#1a1814] text-[#c9a96e] border border-[#c9a96e]/20 text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm shadow-md">
                              Natural
                            </span>
                          )}
                        </div>

                        {/* Interactive overlay on hover */}
                        <div className="absolute inset-0 bg-[#1a1814]/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
                          
                          {/* Quick Log wear button */}
                          <button
                            onClick={(e) => handleQuickLogWear(e, item)}
                            disabled={loggingWearId === item.id}
                            className="w-3/4 max-w-[150px] inline-flex justify-center items-center gap-1.5 bg-[#c9a96e] border border-[#c9a96e] hover:bg-transparent hover:text-[#c9a96e] transition-colors px-3 py-2 text-[10px] uppercase font-bold tracking-wider text-[#1a1814] rounded-sm cursor-pointer disabled:opacity-50"
                          >
                            {loggingWearId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                Log Wear
                              </>
                            )}
                          </button>

                          {/* AI archive suggestion trigger (highly relevant for unworn or low wear items) */}
                          {isUnworn && (
                            <button
                              onClick={(e) => handleOpenAdvisor(e, item)}
                              className="w-3/4 max-w-[150px] inline-flex justify-center items-center gap-1.5 bg-transparent border border-amber-500/40 hover:border-amber-500 hover:text-amber-400 transition-colors px-3 py-2 text-[10px] uppercase font-bold tracking-wider text-[#8a8070] rounded-sm cursor-pointer"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                              AI Archive
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Info & Metadata area */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-[#8a8070] font-semibold block">
                            {item.brand || 'Vintage'}
                          </span>
                          <h3 className="font-serif text-base text-[#f5f0e8] mt-1 line-clamp-1 group-hover:text-[#c9a96e] transition-colors">
                            {item.subcategory || item.category}
                          </h3>
                        </div>

                        {/* Cost-Per-Wear & Wear frequency */}
                        <div className="border-t border-[#c9a96e]/5 pt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center text-[#8a8070] gap-1 font-serif italic">
                              <Compass className="h-3 w-3" />
                              {item.era || 'Contemporary'}
                            </div>
                            <span className="text-[#8a8070] font-mono">
                              Worn: {item.worn_count || 0}x
                            </span>
                          </div>

                          {/* Cost-Per-Wear (CPW) display row */}
                          {item.purchase_price ? (
                            <div className="flex items-center justify-between text-[10px] border-t border-[#c9a96e]/5 pt-1.5 font-mono">
                              <span className="text-[#8a8070] uppercase tracking-tighter">Cost-Per-Wear</span>
                              {isUnworn ? (
                                <span className="text-amber-500 font-serif italic text-[9px]">Unworn</span>
                              ) : (
                                <span className="text-[#c9a96e] font-semibold">
                                  RM {cpw?.toFixed(2)}
                                </span>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* AI Archival Assessment Advisor Modal */}
      {advisingGarment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a1814]/85 backdrop-blur-sm transition-all duration-300">
          <div className="bg-[#252118] border border-[#c9a96e]/20 max-w-lg w-full rounded-sm overflow-hidden shadow-2xl relative flex flex-col">
            
            {/* Modal Header */}
            <div className="border-b border-[#c9a96e]/10 p-5 flex justify-between items-center bg-[#1a1814]/50">
              <h3 className="font-serif text-lg text-[#f5f0e8] flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-amber-500" />
                AI Closet Archival Assessment
              </h3>
              <button 
                onClick={() => setAdvisingGarment(null)}
                className="text-[#8a8070] hover:text-[#f5f0e8] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              
              {/* Item Info row */}
              <div className="flex gap-4 items-center bg-[#1a1814]/30 p-3 border border-[#c9a96e]/5 rounded-sm">
                {advisingGarment.image_urls?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={advisingGarment.image_urls[0]}
                    alt="Garment Preview"
                    className="w-12 h-16 object-cover border border-[#c9a96e]/10 rounded-sm"
                  />
                )}
                <div>
                  <h4 className="font-serif text-sm font-medium text-[#f5f0e8]">
                    {advisingGarment.subcategory || advisingGarment.category}
                  </h4>
                  <p className="text-[10px] text-[#8a8070]">
                    {advisingGarment.brand || 'Vintage'} &bull; {advisingGarment.era || 'Era Unknown'}
                  </p>
                </div>
              </div>

              {/* Assessment results */}
              {adviceLoading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-3">
                  <Loader2 className="h-8 w-8 text-[#c9a96e] animate-spin" />
                  <span className="text-xs text-[#8a8070] font-serif italic">
                    Consulting Gemini appraiser...
                  </span>
                </div>
              ) : adviceResult ? (
                <div className="space-y-5 animate-fade-in">
                  
                  {/* Verdict badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-semibold tracking-wider text-[#8a8070]">
                      Appraisal Recommendation
                    </span>
                    <span className={`px-3 py-1 text-xs uppercase font-bold tracking-widest rounded-sm shadow-md border ${
                      adviceResult.recommendation === 'STYLE'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/25'
                        : adviceResult.recommendation === 'SELL'
                        ? 'bg-amber-950/40 text-amber-400 border-amber-500/25'
                        : 'bg-rose-950/40 text-rose-400 border-rose-500/25'
                    }`}>
                      {adviceResult.recommendation === 'STYLE' ? 'STYLE / KEEP IT' : adviceResult.recommendation === 'SELL' ? 'SELL PIECE' : 'DONATE'}
                    </span>
                  </div>

                  {/* Resale Value Estimate */}
                  {adviceResult.recommendation === 'SELL' && (
                    <div className="bg-[#1a1814]/60 border border-amber-500/20 p-4 rounded-sm">
                      <span className="block text-[10px] uppercase tracking-wider text-[#8a8070] font-bold">
                        Estimated Resale Range
                      </span>
                      <span className="font-serif text-2xl text-amber-400 font-semibold mt-1 block">
                        {adviceResult.resaleValueRange}
                      </span>
                    </div>
                  )}

                  {/* Explanation description */}
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-[#8a8070] mb-1 font-bold">
                      Appraiser Explanation
                    </span>
                    <p className="text-sm text-[#f5f0e8] leading-relaxed font-serif italic">
                      &ldquo;{adviceResult.explanation}&rdquo;
                    </p>
                  </div>

                  {/* Stylist Outfit Suggestion */}
                  {adviceResult.outfitIdea && (
                    <div className="border-t border-[#c9a96e]/10 pt-4">
                      <span className="block text-[10px] uppercase tracking-wider text-[#8a8070] mb-2 font-bold flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-emerald-400" />
                        Stylist's Final Outfit Pairing Try
                      </span>
                      <p className="text-xs text-[#8a8070] leading-relaxed">
                        {adviceResult.outfitIdea}
                      </p>
                    </div>
                  )}

                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#c9a96e]/10 p-5 bg-[#1a1814]/30 flex justify-end">
              <button
                onClick={() => setAdvisingGarment(null)}
                className="px-4 py-2 text-xs uppercase font-bold tracking-wider text-[#8a8070] hover:text-[#f5f0e8] border border-[#c9a96e]/10 hover:border-[#c9a96e]/30 rounded-sm cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
