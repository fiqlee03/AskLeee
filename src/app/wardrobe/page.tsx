import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Navigation from '@/components/Navigation';
import { Shirt, Plus, Compass } from 'lucide-react';
import { GarmentItem } from '@/lib/types';

export default async function WardrobePage() {
  const supabase = await createClient();

  // 1. Verify Authentication Server-side
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/login');
  }

  // 2. Fetch User's Wardrobe Items
  const { data: garments, error: dbError } = await supabase
    .from('garments')
    .select('*')
    .order('created_at', { ascending: false });

  if (dbError) {
    console.error('Error fetching garments:', dbError);
  }

  const items = (garments as GarmentItem[]) || [];

  return (
    <div className="min-h-screen bg-[#1a1814] text-[#f5f0e8] flex flex-col">
      <Navigation />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-12 sm:px-6 lg:px-8">
        {/* Editorial Title Section */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-[#c9a96e]/10 pb-6 mb-10">
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
              {items.length} {items.length === 1 ? 'garment' : 'garments'} curated
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

        {/* Garment Grid layout */}
        {items.length === 0 ? (
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/wardrobe/${item.id}`}
                className="group flex flex-col bg-[#252118] border border-[#c9a96e]/10 overflow-hidden hover:border-[#c9a96e]/30 transition-all rounded-sm"
              >
                {/* Photo container */}
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

                  {/* Natural Fibre Tag */}
                  {item.is_natural_fibre && (
                    <span className="absolute bottom-3 left-3 bg-[#c9a96e] text-[#1a1814] text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm">
                      Natural
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#8a8070] font-semibold block">
                      {item.brand || 'Vintage'}
                    </span>
                    <h3 className="font-serif text-base text-[#f5f0e8] mt-1 line-clamp-1 group-hover:text-[#c9a96e] transition-colors">
                      {item.subcategory || item.category}
                    </h3>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#c9a96e]/5 pt-3">
                    <div className="flex items-center text-[11px] text-[#8a8070] gap-1 font-serif italic">
                      <Compass className="h-3 w-3" />
                      {item.era || 'Contemporary'}
                    </div>
                    {item.worn_count > 0 && (
                      <span className="text-[10px] text-[#8a8070] uppercase font-mono tracking-tighter">
                        Worn {item.worn_count}x
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
