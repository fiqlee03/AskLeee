import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Navigation from '@/components/Navigation';
import { 
  Shirt, 
  Plus, 
  Sparkles, 
  DollarSign, 
  Layers, 
  MessageSquare, 
  Tag, 
  BarChart3, 
  ArrowRight,
  Compass
} from 'lucide-react';
import { GarmentItem } from '@/lib/types';

export default async function HomePage() {
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
    console.error('Error fetching garments for dashboard:', dbError);
  }

  const items = (garments as GarmentItem[]) || [];

  // Calculate Metrics
  const totalItems = items.length;
  const totalInvestment = items.reduce((sum, item) => sum + (item.purchase_price || 0), 0);
  
  const naturalFiberCount = items.filter(item => item.is_natural_fibre).length;
  const naturalFiberRatio = totalItems > 0 ? (naturalFiberCount / totalItems) * 100 : 0;

  // Underutilized Gem Spotlight
  let spotlightItem = null;
  if (totalItems > 0) {
    const unwornItems = items.filter(item => (item.worn_count || 0) === 0);
    if (unwornItems.length > 0) {
      // Pick the oldest unworn item (last in the list, since it's sorted by created_at desc)
      spotlightItem = unwornItems[unwornItems.length - 1];
    } else {
      // Pick the oldest worn item overall
      spotlightItem = items[items.length - 1];
    }
  }

  // Get 4 most recent acquisitions
  const recentItems = items.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#1a1814] text-[#f5f0e8] flex flex-col">
      <Navigation />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#c9a96e]/10 pb-8 gap-6">
          <div>
            <h2 className="font-serif text-xs uppercase tracking-widest text-[#8a8070] mb-2">
              Atelier Overview
            </h2>
            <h1 className="font-serif text-4xl sm:text-5xl font-light tracking-wide text-[#f5f0e8] truncate max-w-xl">
              Welcome back, {user.email?.split('@')[0]}
            </h1>
            <p className="text-sm text-[#8a8070] mt-1 font-serif italic">
              Your personal wardrobe curator and style intelligence center.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/wardrobe/upload"
              className="inline-flex items-center gap-2 border border-[#c9a96e] bg-[#c9a96e] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#1a1814] transition-all hover:bg-transparent hover:text-[#c9a96e] rounded-sm"
            >
              <Plus className="h-4 w-4" />
              Add Garment
            </Link>
            <Link
              href="/ask"
              className="inline-flex items-center gap-2 border border-[#c9a96e]/20 bg-transparent px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#c9a96e] hover:border-[#c9a96e] transition-all rounded-sm"
            >
              <MessageSquare className="h-4 w-4" />
              Consult Stylist
            </Link>
            <Link
              href="/thrift"
              className="inline-flex items-center gap-2 border border-[#c9a96e]/20 bg-transparent px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#c9a96e] hover:border-[#c9a96e] transition-all rounded-sm"
            >
              <Tag className="h-4 w-4" />
              Thrift Mode
            </Link>
          </div>
        </div>

        {/* Executive Stats Dashboard Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-[#252118] border border-[#c9a96e]/10 p-6 rounded-sm shadow-md flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8a8070]">
                Total Curated Items
              </span>
              <span className="font-serif text-3xl font-light text-[#f5f0e8] mt-2 block">
                {totalItems} <span className="text-sm font-sans text-[#8a8070]">items</span>
              </span>
            </div>
            <Shirt className="h-8 w-8 text-[#c9a96e]/30 stroke-[1.25]" />
          </div>

          <div className="bg-[#252118] border border-[#c9a96e]/10 p-6 rounded-sm shadow-md flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8a8070]">
                Estimated Closet Value
              </span>
              <span className="font-serif text-3xl font-light text-[#f5f0e8] mt-2 block">
                RM {totalInvestment.toFixed(2)}
              </span>
            </div>
            <DollarSign className="h-8 w-8 text-[#c9a96e]/30 stroke-[1.25]" />
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
            <Sparkles className="h-8 w-8 text-[#c9a96e]/30 stroke-[1.25]" />
          </div>
        </div>

        {/* Double Column: Spotlight & System Directory */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Column 1: Closet Spotlight (Underutilized Gem) */}
          <div className="lg:col-span-7 flex flex-col">
            <h3 className="font-serif text-xs uppercase tracking-widest text-[#8a8070] mb-4">
              Closet Spotlight
            </h3>
            
            {spotlightItem ? (
              <div className="bg-[#252118] border border-[#c9a96e]/10 p-6 rounded-sm shadow-md flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-[#c9a96e] uppercase">
                    {(spotlightItem.worn_count || 0) === 0 ? 'Underutilized Gem' : 'Styling Suggestion'}
                  </span>
                  <h4 className="font-serif text-2xl font-light text-[#f5f0e8] mt-1 mb-6">
                    {(spotlightItem.worn_count || 0) === 0 
                      ? "You haven't worn this item yet. Give it some love!"
                      : "Style this classic piece in a new combination today."}
                  </h4>
                  
                  {/* Spotlight Item Card */}
                  <div className="flex flex-col sm:flex-row gap-6 border border-[#c9a96e]/5 bg-[#1a1814]/40 p-4 rounded-sm">
                    {/* Image */}
                    <div className="relative w-full sm:w-1/3 aspect-[3/4] bg-[#1a1814] overflow-hidden rounded-sm flex-shrink-0">
                      {spotlightItem.image_urls?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={spotlightItem.image_urls[0]}
                          alt={spotlightItem.subcategory || spotlightItem.category}
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Shirt className="h-8 w-8 text-[#8a8070] stroke-[1]" />
                        </div>
                      )}
                      {spotlightItem.is_natural_fibre && (
                        <span className="absolute bottom-2 left-2 bg-[#c9a96e] text-[#1a1814] text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-sm">
                          Natural
                        </span>
                      )}
                    </div>

                    {/* Meta details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase tracking-wider text-[#8a8070] font-semibold block">
                          {spotlightItem.brand || 'Vintage'}
                        </span>
                        <h5 className="font-serif text-xl text-[#f5f0e8]">
                          {spotlightItem.subcategory || spotlightItem.category}
                        </h5>
                        
                        <div className="flex items-center text-xs text-[#8a8070] gap-1.5 font-serif italic pt-1">
                          <Compass className="h-3.5 w-3.5" />
                          {spotlightItem.era || 'Contemporary'}
                        </div>
                      </div>

                      <div className="border-t border-[#c9a96e]/5 pt-4 mt-4 flex items-center justify-between text-xs text-[#8a8070]">
                        <span>Worn Count: <strong className="font-mono text-[#f5f0e8]">{spotlightItem.worn_count || 0}x</strong></span>
                        {spotlightItem.purchase_price && (
                          <span>Cost: <strong className="font-sans text-[#f5f0e8]">RM {spotlightItem.purchase_price.toFixed(2)}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-[#c9a96e]/5 flex items-center justify-between">
                  <span className="text-xs text-[#8a8070]">
                    Need ideas? Let Gemini suggest an outfit context.
                  </span>
                  <Link
                    href={`/ask?item=${spotlightItem.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#c9a96e] hover:text-[#f5f0e8] transition-colors"
                  >
                    Get Outfit Recommendation
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-[#252118] border border-dashed border-[#c9a96e]/20 p-8 rounded-sm shadow-md flex-1 flex flex-col items-center justify-center text-center">
                <Shirt className="h-10 w-10 text-[#8a8070] mb-3 stroke-[1.25]" />
                <h4 className="font-serif text-lg text-[#f5f0e8] mb-1">Your Spotlight is Empty</h4>
                <p className="text-xs text-[#8a8070] max-w-xs mb-4">
                  Add garments to your collection to unlock personalized style recommendations and underutilized spotlights.
                </p>
                <Link
                  href="/wardrobe/upload"
                  className="inline-flex items-center gap-2 border border-[#c9a96e]/30 bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#c9a96e] hover:border-[#c9a96e] hover:text-[#f5f0e8] transition-all rounded-sm"
                >
                  Upload First Garment
                </Link>
              </div>
            )}
          </div>

          {/* Column 2: System Directory (Quick Modules) */}
          <div className="lg:col-span-5 flex flex-col">
            <h3 className="font-serif text-xs uppercase tracking-widest text-[#8a8070] mb-4">
              System Directory
            </h3>
            
            <div className="space-y-4 flex-1 flex flex-col">
              {[
                {
                  title: 'The Wardrobe',
                  description: 'Browse, manage, and inspect your curated garment collection.',
                  href: '/wardrobe',
                  icon: Shirt,
                },
                {
                  title: 'AI Stylist',
                  description: 'Engage with Gemini to formulate lookbooks and get styled.',
                  href: '/ask',
                  icon: MessageSquare,
                },
                {
                  title: 'Thrift Mode',
                  description: 'Inspect garments on-the-go for brand value, fibers, and eras.',
                  href: '/thrift',
                  icon: Tag,
                },
                {
                  title: 'Closet Analytics',
                  description: 'Explore value distribution, cost-per-wear index, and fiber splits.',
                  href: '/analytics',
                  icon: BarChart3,
                },
              ].map((module) => {
                const Icon = module.icon;
                return (
                  <Link
                    key={module.title}
                    href={module.href}
                    className="group flex items-start gap-4 bg-[#252118] border border-[#c9a96e]/10 p-4 rounded-sm hover:border-[#c9a96e]/35 transition-all shadow-sm"
                  >
                    <div className="bg-[#1a1814] p-2.5 rounded-sm border border-[#c9a96e]/5 group-hover:border-[#c9a96e]/20 transition-all">
                      <Icon className="h-5 w-5 text-[#c9a96e] stroke-[1.25]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif text-base text-[#f5f0e8] group-hover:text-[#c9a96e] transition-colors">
                          {module.title}
                        </h4>
                        <ArrowRight className="h-3.5 w-3.5 text-[#8a8070] group-hover:text-[#c9a96e] group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-xs text-[#8a8070] mt-1 leading-relaxed">
                        {module.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recently Curated Section */}
        {recentItems.length > 0 && (
          <div className="pt-6 border-t border-[#c9a96e]/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-serif text-xs uppercase tracking-widest text-[#8a8070] mb-1">
                  Recent Additions
                </h3>
                <h4 className="font-serif text-xl font-light text-[#f5f0e8]">
                  The Latest Acquisitions
                </h4>
              </div>
              <Link
                href="/wardrobe"
                className="text-xs uppercase font-semibold tracking-wider text-[#c9a96e] hover:text-[#f5f0e8] transition-colors inline-flex items-center gap-1"
              >
                View Full Closet
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {recentItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/wardrobe/${item.id}`}
                  className="group bg-[#252118] border border-[#c9a96e]/10 overflow-hidden hover:border-[#c9a96e]/25 transition-all rounded-sm flex flex-col"
                >
                  <div className="relative aspect-[3/4] bg-[#1a1814] overflow-hidden">
                    {item.image_urls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_urls[0]}
                        alt={item.subcategory || item.category}
                        className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-103"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Shirt className="h-8 w-8 text-[#8a8070] stroke-[1]" />
                      </div>
                    )}
                    {item.is_natural_fibre && (
                      <span className="absolute bottom-2 left-2 bg-[#c9a96e] text-[#1a1814] text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-sm">
                        Natural
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#8a8070] font-semibold block">
                        {item.brand || 'Vintage'}
                      </span>
                      <h5 className="font-serif text-sm text-[#f5f0e8] mt-0.5 line-clamp-1 group-hover:text-[#c9a96e] transition-colors">
                        {item.subcategory || item.category}
                      </h5>
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] text-[#8a8070] border-t border-[#c9a96e]/5 pt-2 mt-3 font-serif italic">
                      <span className="flex items-center gap-1">
                        <Compass className="h-2.5 w-2.5" />
                        {item.era || 'Contemporary'}
                      </span>
                      {item.worn_count > 0 && (
                        <span className="font-mono not-italic uppercase tracking-tighter">Worn {item.worn_count}x</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
