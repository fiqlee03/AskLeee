'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Navigation from '@/components/Navigation';
import { BarChart3, Loader2, Sparkles, Shirt, DollarSign, Layers } from 'lucide-react';
import Link from 'next/link';
import { GarmentItem } from '@/lib/types';

export default function AnalyticsPage() {
  const supabase = createClient();

  const [garments, setGarments] = useState<GarmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGarments() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('garments')
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;
        setGarments(data || []);
      } catch (err) {
        console.error('Failed to load analytics wardrobe data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGarments();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1814] text-[#f5f0e8] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-[#c9a96e] animate-spin" />
      </div>
    );
  }

  // Calculate Metrics
  const totalItems = garments.length;
  const totalInvestment = garments.reduce((sum, item) => sum + (item.purchase_price || 0), 0);
  const avgCost = totalItems > 0 ? totalInvestment / totalItems : 0;
  
  const naturalFiberCount = garments.filter(item => item.is_natural_fibre).length;
  const naturalFiberRatio = totalItems > 0 ? (naturalFiberCount / totalItems) * 100 : 0;

  // Category Distribution
  const categoriesMap: { [key: string]: number } = {};
  garments.forEach(item => {
    const cat = item.category || 'other';
    categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;
  });

  const categoriesData = Object.entries(categoriesMap).map(([name, count]) => ({
    name,
    count,
    percentage: totalItems > 0 ? (count / totalItems) * 100 : 0,
  })).sort((a, b) => b.count - a.count);

  // Era Distribution
  const erasMap: { [key: string]: number } = {};
  garments.forEach(item => {
    const era = item.era || 'Contemporary';
    erasMap[era] = (erasMap[era] || 0) + 1;
  });

  const erasData = Object.entries(erasMap).map(([name, count]) => ({
    name,
    count,
    percentage: totalItems > 0 ? (count / totalItems) * 100 : 0,
  })).sort((a, b) => b.count - a.count);

  // Cost Per Wear Insights
  const costPerWearList = garments
    .map(item => {
      const price = item.purchase_price || 0;
      const wears = item.worn_count || 0;
      const cpw = wears > 0 ? price / wears : price;
      
      // Efficiency tier label
      let tier = 'Neutral';
      let tierColor = 'text-[#8a8070]';
      if (price > 0 && wears === 0) {
        tier = 'Unworn';
        tierColor = 'text-rose-400';
      } else if (wears >= 10 && cpw < 10) {
        tier = 'Highly Efficient';
        tierColor = 'text-emerald-400';
      } else if (price > 150 && wears < 3) {
        tier = 'Underutilized';
        tierColor = 'text-amber-400';
      }

      return {
        ...item,
        cpw,
        tier,
        tierColor,
      };
    })
    .sort((a, b) => b.cpw - a.cpw); // highest CPW first

  return (
    <div className="min-h-screen bg-[#1a1814] text-[#f5f0e8] flex flex-col">
      <Navigation />

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-12 sm:px-6">
        {/* Title Section */}
        <div className="border-b border-[#c9a96e]/10 pb-6 mb-10">
          <h2 className="font-serif text-xs uppercase tracking-widest text-[#8a8070] mb-2">
            Wardrobe Insights
          </h2>
          <h1 className="font-serif text-4xl font-light tracking-wide text-[#f5f0e8]">
            Closet Analytics
          </h1>
        </div>

        {totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center border border-[#c9a96e]/10 bg-[#252118]/50 p-12 text-center rounded-sm min-h-[400px]">
            <BarChart3 className="h-16 w-16 text-[#8a8070]/60 mb-4 stroke-[1.25]" />
            <h2 className="font-serif text-2xl text-[#f5f0e8] mb-2 font-light">
              No Data to Visualize
            </h2>
            <p className="text-sm text-[#8a8070] max-w-md leading-relaxed mb-6">
              You haven&apos;t catalogued any garments in your closet yet. Add some clothes to see real-time insights on investments, fabric splits, and wear metrics.
            </p>
            <Link
              href="/wardrobe/upload"
              className="inline-flex items-center gap-2 border border-[#c9a96e] bg-[#c9a96e] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#1a1814] hover:bg-transparent hover:text-[#c9a96e] transition-all rounded-sm"
            >
              Add Your First Garment
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Metric Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#252118] border border-[#c9a96e]/10 p-6 rounded-sm shadow-md flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8a8070]">
                    Total Catalogued
                  </span>
                  <span className="font-serif text-3xl font-light text-[#f5f0e8] mt-2 block">
                    {totalItems} <span className="text-sm font-sans text-[#8a8070]">items</span>
                  </span>
                </div>
                <Shirt className="h-8 w-8 text-[#c9a96e]/40 stroke-[1.25]" />
              </div>

              <div className="bg-[#252118] border border-[#c9a96e]/10 p-6 rounded-sm shadow-md flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8a8070]">
                    Closet Value
                  </span>
                  <span className="font-serif text-3xl font-light text-[#f5f0e8] mt-2 block">
                    RM {totalInvestment.toFixed(2)}
                  </span>
                </div>
                <DollarSign className="h-8 w-8 text-[#c9a96e]/40 stroke-[1.25]" />
              </div>

              <div className="bg-[#252118] border border-[#c9a96e]/10 p-6 rounded-sm shadow-md flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8a8070]">
                    Average Item Cost
                  </span>
                  <span className="font-serif text-3xl font-light text-[#f5f0e8] mt-2 block">
                    RM {avgCost.toFixed(2)}
                  </span>
                </div>
                <Layers className="h-8 w-8 text-[#c9a96e]/40 stroke-[1.25]" />
              </div>

              <div className="bg-[#252118] border border-[#c9a96e]/10 p-6 rounded-sm shadow-md flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8a8070]">
                    Natural Fiber Ratio
                  </span>
                  <span className="font-serif text-3xl font-light text-[#f5f0e8] mt-2 block">
                    {naturalFiberRatio.toFixed(0)}% <span className="text-sm font-sans text-[#8a8070]">pure</span>
                  </span>
                </div>
                <Sparkles className="h-8 w-8 text-[#c9a96e]/40 stroke-[1.25]" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Category Breakdown */}
              <div className="bg-[#252118] border border-[#c9a96e]/10 p-6 rounded-sm shadow-md space-y-4">
                <h3 className="font-serif text-lg font-light text-[#f5f0e8]">Category Distribution</h3>
                <div className="space-y-4 pt-2">
                  {categoriesData.map((cat) => (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="capitalize text-[#f5f0e8]">{cat.name}</span>
                        <span className="text-[#8a8070]">{cat.count} items ({cat.percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-[#1a1814] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#c9a96e] h-full transition-all"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Era Breakdown */}
              <div className="bg-[#252118] border border-[#c9a96e]/10 p-6 rounded-sm shadow-md space-y-4">
                <h3 className="font-serif text-lg font-light text-[#f5f0e8]">Pedigree / Era Distribution</h3>
                <div className="space-y-4 pt-2">
                  {erasData.map((era) => (
                    <div key={era.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[#f5f0e8]">{era.name}</span>
                        <span className="text-[#8a8070]">{era.count} items ({era.percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-[#1a1814] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#c9a96e] h-full transition-all"
                          style={{ width: `${era.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cost Per Wear Table */}
            <div className="bg-[#252118] border border-[#c9a96e]/10 p-6 rounded-sm shadow-md space-y-4">
              <div>
                <h3 className="font-serif text-lg font-light text-[#f5f0e8]">Cost Per Wear (CPW) Index</h3>
                <p className="text-xs text-[#8a8070] mt-1 leading-relaxed">
                  Track how efficient your wardrobe investment is. Higher wears drive down the Cost Per Wear.
                </p>
              </div>

              <div className="overflow-x-auto pt-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#c9a96e]/15 text-[10px] uppercase font-bold tracking-wider text-[#8a8070]">
                      <th className="pb-3">Garment</th>
                      <th className="pb-3">Purchase Price</th>
                      <th className="pb-3">Worn Count</th>
                      <th className="pb-3">Cost Per Wear</th>
                      <th className="pb-3">Efficiency Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c9a96e]/5 text-sm text-[#f5f0e8]">
                    {costPerWearList.map((item) => (
                      <tr key={item.id} className="hover:bg-[#1a1814]/30 transition-colors">
                        <td className="py-3.5 font-semibold">
                          <Link href={`/wardrobe/${item.id}`} className="hover:text-[#c9a96e] hover:underline">
                            {item.subcategory || item.category}
                            {item.brand && <span className="block text-[11px] font-normal text-[#8a8070] font-serif italic">by {item.brand}</span>}
                          </Link>
                        </td>
                        <td className="py-3.5">
                          {item.purchase_price ? `RM ${item.purchase_price.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3.5 font-mono">
                          {item.worn_count || 0}
                        </td>
                        <td className="py-3.5 font-serif text-[#c9a96e] font-semibold">
                          {item.purchase_price ? `RM ${item.cpw.toFixed(2)}` : '—'}
                        </td>
                        <td className={`py-3.5 font-semibold text-xs ${item.tierColor}`}>
                          {item.tier}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
