'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Navigation from '@/components/Navigation';
import { Shirt, Trash2, Check, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { GarmentItem } from '@/lib/types';

export default function GarmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const supabase = createClient();
  
  // Unwrap params using React.use()
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [garment, setGarment] = useState<GarmentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [wornCount, setWornCount] = useState(0);

  useEffect(() => {
    async function fetchGarment() {
      try {
        const { data, error } = await supabase
          .from('garments')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setGarment(data);
        setNotes(data.notes || '');
        setWornCount(data.worn_count || 0);
      } catch (err) {
        console.error('Error fetching garment:', err);
        alert('Failed to load garment details.');
        router.push('/wardrobe');
      } finally {
        setLoading(false);
      }
    }
    fetchGarment();
  }, [id, supabase, router]);

  const handleLogWear = async () => {
    if (!garment) return;
    setUpdating(true);
    try {
      const newCount = wornCount + 1;
      const { error } = await supabase
        .from('garments')
        .update({ worn_count: newCount })
        .eq('id', garment.id);

      if (error) throw error;
      setWornCount(newCount);
    } catch (err) {
      console.error('Failed to log wear:', err);
      alert('Could not update wear count.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!garment) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('garments')
        .update({ notes })
        .eq('id', garment.id);

      if (error) throw error;
      setGarment({ ...garment, notes });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update notes:', err);
      alert('Could not save notes.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!garment) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this garment from your CLOSET?');
    if (!confirmDelete) return;

    setDeleting(true);

    try {
      // 1. Delete image from Storage if it exists
      if (garment.image_urls?.[0]) {
        const urlParts = garment.image_urls[0].split('/storage/v1/object/public/garments/');
        if (urlParts.length === 2) {
          const storagePath = decodeURIComponent(urlParts[1]);
          const { error: storageError } = await supabase.storage
            .from('garments')
            .remove([storagePath]);
          if (storageError) console.error('Storage deletion warning:', storageError);
        }
      }

      // 2. Delete database record
      const { error: dbError } = await supabase
        .from('garments')
        .delete()
        .eq('id', garment.id);

      if (dbError) throw dbError;

      router.push('/wardrobe');
      router.refresh();
    } catch (err) {
      console.error('Error deleting garment:', err);
      alert('Failed to delete garment.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1814] text-[#f5f0e8] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-[#c9a96e] animate-spin" />
      </div>
    );
  }

  if (!garment) return null;

  return (
    <div className="min-h-screen bg-[#1a1814] text-[#f5f0e8] flex flex-col">
      <Navigation />

      <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-12 sm:px-6">
        {/* Back Link */}
        <Link
          href="/wardrobe"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8a8070] hover:text-[#c9a96e] transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Wardrobe
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left: Garment Image */}
          <div className="relative aspect-[3/4] bg-[#252118] border border-[#c9a96e]/20 rounded-sm overflow-hidden shadow-2xl">
            {garment.image_urls?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={garment.image_urls[0]}
                alt={garment.subcategory || garment.category}
                className="h-full w-full object-cover object-center"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Shirt className="h-16 w-16 text-[#8a8070] stroke-[1]" />
              </div>
            )}
          </div>

          {/* Right: Spec Details */}
          <div className="flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              {/* Header Info */}
              <div className="border-b border-[#c9a96e]/10 pb-6">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#c9a96e] border border-[#c9a96e]/20 px-2.5 py-0.5 rounded-sm">
                    {garment.category}
                  </span>
                  {garment.is_natural_fibre && (
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#1a1814] bg-[#c9a96e] px-2.5 py-0.5 rounded-sm">
                      100% Natural Fibre
                    </span>
                  )}
                </div>
                <h1 className="font-serif text-4xl sm:text-5xl font-light tracking-wide text-[#f5f0e8] mt-4">
                  {garment.subcategory || garment.category}
                </h1>
                <p className="font-serif text-lg italic text-[#8a8070] mt-2">
                  by {garment.brand || 'Unknown / Vintage'}
                </p>
              </div>

              {/* AI generated description card */}
              {garment.ai_summary && (
                <div className="bg-[#252118] border border-[#c9a96e]/10 p-5 rounded-sm">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8070] mb-2">
                    Gemini Archivist Summary
                  </h4>
                  <p className="font-serif text-sm italic text-[#f5f0e8] leading-relaxed">
                    &ldquo;{garment.ai_summary}&rdquo;
                  </p>
                </div>
              )}

              {/* Specifications list */}
              <div className="grid grid-cols-2 gap-6 border-b border-[#c9a96e]/10 pb-6">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8a8070]">
                    Era
                  </span>
                  <span className="font-serif text-base text-[#f5f0e8] mt-1 block">
                    {garment.era || 'Contemporary'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8a8070]">
                    Purchase Price
                  </span>
                  <span className="font-serif text-base text-[#f5f0e8] mt-1 block">
                    {garment.purchase_price ? `RM ${garment.purchase_price.toFixed(2)}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8a8070]">
                    Colours
                  </span>
                  <span className="text-sm text-[#f5f0e8] mt-1 block capitalize">
                    {garment.colours?.join(', ') || '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8a8070]">
                    Fabrics
                  </span>
                  <span className="text-sm text-[#f5f0e8] mt-1 block capitalize">
                    {garment.fabrics?.join(', ') || '—'}
                  </span>
                </div>
              </div>

              {/* Wearing logs & tracking */}
              <div className="flex items-center justify-between bg-[#252118] border border-[#c9a96e]/10 p-4 rounded-sm">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8a8070]">
                    Wear Frequency
                  </span>
                  <span className="font-serif text-xl font-light text-[#f5f0e8] mt-1 block">
                    Worn <span className="font-semibold text-[#c9a96e]">{wornCount}</span> {wornCount === 1 ? 'time' : 'times'}
                  </span>
                </div>
                <button
                  onClick={handleLogWear}
                  disabled={updating}
                  className="inline-flex items-center gap-2 border border-[#c9a96e] bg-[#c9a96e] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#1a1814] hover:bg-transparent hover:text-[#c9a96e] transition-all rounded-sm cursor-pointer disabled:opacity-50"
                >
                  Log Wear
                </button>
              </div>

              {/* User Notes */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8070]">
                    Personal Notes
                  </label>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-[#c9a96e] hover:underline cursor-pointer"
                    >
                      Edit Notes
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveNotes}
                        disabled={updating}
                        className="text-xs text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="h-3 w-3" /> Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setNotes(garment.notes || '');
                        }}
                        className="text-xs text-rose-400 hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {!isEditing ? (
                  <p className="text-sm text-[#8a8070] leading-relaxed bg-[#252118]/40 border border-[#c9a96e]/5 p-4 rounded-sm italic min-h-[80px]">
                    {notes || 'No custom notes logged yet.'}
                  </p>
                ) : (
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    disabled={updating}
                    className="block w-full border border-[#c9a96e]/20 bg-[#252118] px-4 py-3 text-[#f5f0e8] placeholder-[#8a8070]/30 outline-none transition-all focus:border-[#c9a96e] rounded-sm text-sm"
                  />
                )}
              </div>
            </div>

            {/* Delete Garment */}
            <div className="border-t border-[#c9a96e]/10 pt-6">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 border border-rose-500/20 bg-rose-950/20 hover:bg-rose-950/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-rose-400 transition-all rounded-sm cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Removing Garment...' : 'Remove from Closet'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
