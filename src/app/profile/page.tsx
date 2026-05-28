'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Navigation from '@/components/Navigation';
import { User, Sparkles, Save, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const PRESETS = [
  {
    name: 'Japanese Americana / Vintage Ivy',
    description: 'Vintage Ivy League, collegiate styles, workwear, and denim. Focuses on boxy cuts and boxy silhouettes.',
    text: 'I focus on vintage Ivy League styles, Japanese Americana, and high-quality construction. I prefer materials like heavy wool, denim, cotton, and linen. I favor heritage brands (e.g., Polo Ralph Lauren, L.L. Bean, Pendleton, J.Press) and boxy, comfortable silhouettes. Highlight these features and suggest clean, classic pairings.',
  },
  {
    name: 'Minimalist Essentials',
    description: 'Clean tailoring, zero external branding, neutral tones, and fabric purity.',
    text: 'I focus on high-quality, minimal essentials with clean lines and zero branding. I stick to a neutral color palette (navy, grey, black, olive, cream). I prefer natural fibers like merino wool, cashmere, cotton, and linen. Suggest clean, structured outfits and evaluate thrift quality based on durability and material purity.',
  },
  {
    name: 'Rugged Workwear / Surplus',
    description: 'Durable construction, pre-1990s denim, faded tees, and utility pockets.',
    text: 'I focus on rugged vintage workwear and military surplus aesthetics. I look for pre-1990s construction, heavy cotton duck, denim, twill, and flannel. I like details like union labels, utility pockets, and faded washes. Avoid fast-fashion brands and flag synthetic blends over 20% as low quality.',
  },
  {
    name: 'Relaxed Bohemian / Summer Linen',
    description: 'Lightweight linen, flowing silhouettes, warm neutrals, and breathable layering.',
    text: 'I focus on relaxed, flowing silhouettes, breathable linens, silk blends, and lightweight cottons. I love earth tones, warm neutrals, and subtle textures. Suggest casual, layered summer looks and evaluate garments based on lightweight drape and comfort.',
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setEmail(user.email || '');

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error.message || error);
          }
        } else if (profile) {
          setInstructions(profile.ai_instructions || '');
        }
      } catch (err: any) {
        console.error('Failed to load profile settings:', err?.message || err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [supabase, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found.');

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ai_instructions: instructions,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Style preferences saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to save profile:', err?.message || err);
      setMessage({
        type: 'error',
        text: err?.message || 'An error occurred while saving your preferences.',
      });
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (text: string) => {
    setInstructions(text);
  };

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

      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        {/* Title Section */}
        <div className="border-b border-[#c9a96e]/10 pb-6 mb-10">
          <h2 className="font-serif text-xs uppercase tracking-widest text-[#8a8070] mb-2">
            Settings & Customization
          </h2>
          <h1 className="font-serif text-4xl font-light tracking-wide text-[#f5f0e8]">
            User Profile
          </h1>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`p-4 text-sm font-serif rounded-sm flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-950/40 text-rose-400 border border-rose-500/20'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-400" />
            )}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Account Details Side Card */}
          <div className="md:col-span-1 bg-[#252118] border border-[#c9a96e]/10 p-6 rounded-sm shadow-md h-fit">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-[#1a1814] p-4 rounded-full border border-[#c9a96e]/10">
                <User className="h-12 w-12 text-[#c9a96e] stroke-[1.25]" />
              </div>
              <div className="space-y-1 w-full min-w-0">
                <h3 className="font-serif text-lg text-[#f5f0e8] truncate">
                  {email.split('@')[0]}
                </h3>
                <p className="text-xs text-[#8a8070] font-mono truncate">
                  {email}
                </p>
              </div>
            </div>
            <div className="border-t border-[#c9a96e]/10 mt-6 pt-6 text-xs text-[#8a8070] leading-relaxed">
              Define your custom instructions to personalize outfit recommendations and thrift appraisals. Custom prompts override default guidelines.
            </div>
          </div>

          {/* Form Area */}
          <form onSubmit={handleSave} className="md:col-span-2 space-y-8">
            <div className="bg-[#252118] border border-[#c9a96e]/10 p-6 rounded-sm shadow-md space-y-6">
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8070]">
                  AI Style Instructions
                </label>
                <p className="text-xs text-[#8a8070] mt-1 leading-relaxed">
                  Provide custom instructions for Gemini. Describe your preferred aesthetics, brands, fabrics, fits, or specific quality rules (e.g. *Japanese Ivy*, *prefer 100% natural fibers*, *flag polyester*).
                </p>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="mt-3 block w-full min-h-[220px] border border-[#c9a96e]/20 bg-[#1a1814] px-4 py-3 text-sm text-[#f5f0e8] placeholder-[#8a8070]/40 outline-none transition-all focus:border-[#c9a96e] font-sans leading-relaxed rounded-sm"
                  placeholder="e.g. I prefer Ivy League styles with boxy fits. Focus suggestions on cotton, linen, and wool. Avoid polyester, and highlight vintage tags..."
                />
              </div>

              {/* Preset suggestions */}
              <div className="space-y-3">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#8a8070] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#c9a96e]" />
                  Style Preset Starters
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset.text)}
                      className="text-left bg-[#1a1814]/60 border border-[#c9a96e]/10 hover:border-[#c9a96e]/30 p-3 rounded-sm transition-all group cursor-pointer"
                    >
                      <h4 className="font-serif text-xs text-[#c9a96e] group-hover:text-[#f5f0e8] transition-colors">
                        {preset.name}
                      </h4>
                      <p className="text-[10px] text-[#8a8070] mt-1 line-clamp-2 leading-normal">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 border border-[#c9a96e] bg-[#c9a96e] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#1a1814] transition-all hover:bg-transparent hover:text-[#c9a96e] rounded-sm cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-current" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
