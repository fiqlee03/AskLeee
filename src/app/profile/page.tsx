'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Navigation from '@/components/Navigation';
import { 
  User, Sparkles, Save, Loader2, CheckCircle2, XCircle, 
  Upload, PenSquare, Trash2, Tag, Star, Heart, Check, X, Camera 
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { GarmentItem } from '@/lib/types';

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
  const [bio, setBio] = useState('');
  const [wishlist, setWishlist] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [myGarments, setMyGarments] = useState<GarmentItem[]>([]);
  
  // Grail section states
  const [selectedGarmentId, setSelectedGarmentId] = useState('');
  const [pendingStory, setPendingStory] = useState('');
  const [pinning, setPinning] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [tempStory, setTempStory] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setEmail(user.email || '');

        // 1. Fetch Profile
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
          setBio(profile.bio || '');
          setAvatarUrl(profile.avatar_url || null);
          setWishlist(profile.wishlist || '');
        }

        // 2. Fetch User Garments for Grail Gallery
        const { data: garments } = await supabase
          .from('garments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (garments) {
          setMyGarments(garments);
        }
      } catch (err: any) {
        console.error('Failed to load profile data:', err?.message || err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [supabase, router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found.');

      let finalAvatarUrl = avatarUrl;

      // Upload avatar if a new one is selected
      if (avatarFile) {
        const options = {
          maxSizeMB: 0.1,
          maxWidthOrHeight: 400,
          useWebWorker: true,
        };
        const compressed = await imageCompression(avatarFile, options);
        
        const fileExt = avatarFile.type.split('/')[1] || 'jpg';
        const filePath = `${user.id}/avatar.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('garments')
          .upload(filePath, compressed, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl: url } } = supabase.storage
          .from('garments')
          .getPublicUrl(filePath);
          
        finalAvatarUrl = url;
        setAvatarUrl(url);
        setAvatarFile(null);
      }

      // Upsert profile
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ai_instructions: instructions,
          bio: bio,
          avatar_url: finalAvatarUrl,
          wishlist: wishlist,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Curator profile updated successfully!' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      router.refresh();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to save profile:', err?.message || err);
      setMessage({
        type: 'error',
        text: err?.message || 'An error occurred while saving your profile settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Grail operations
  const handlePinGrail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGarmentId) return;
    setPinning(true);

    try {
      const { error } = await supabase
        .from('garments')
        .update({
          is_grail: true,
          discovery_story: pendingStory,
        })
        .eq('id', selectedGarmentId);

      if (error) throw error;

      setMyGarments(prev =>
        prev.map(g =>
          g.id === selectedGarmentId
            ? { ...g, is_grail: true, discovery_story: pendingStory }
            : g
        )
      );

      setSelectedGarmentId('');
      setPendingStory('');
      setMessage({ type: 'success', text: 'Garment added to Grail Gallery!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to pin grail:', err);
      alert('Error pinning grail: ' + err.message);
    } finally {
      setPinning(false);
    }
  };

  const handleUnpinGrail = async (garmentId: string) => {
    const confirm = window.confirm('Unpin this garment from your Grail Gallery?');
    if (!confirm) return;

    try {
      const { error } = await supabase
        .from('garments')
        .update({
          is_grail: false,
          discovery_story: null,
        })
        .eq('id', garmentId);

      if (error) throw error;

      setMyGarments(prev =>
        prev.map(g =>
          g.id === garmentId
            ? { ...g, is_grail: false, discovery_story: undefined }
            : g
        )
      );
    } catch (err: any) {
      console.error('Failed to unpin grail:', err);
      alert('Error unpinning grail: ' + err.message);
    }
  };

  const handleSaveStory = async (garmentId: string) => {
    try {
      const { error } = await supabase
        .from('garments')
        .update({ discovery_story: tempStory })
        .eq('id', garmentId);

      if (error) throw error;

      setMyGarments(prev =>
        prev.map(g =>
          g.id === garmentId
            ? { ...g, discovery_story: tempStory }
            : g
        )
      );
      setEditingStoryId(null);
    } catch (err: any) {
      console.error('Failed to update discovery story:', err);
      alert('Error saving story: ' + err.message);
    }
  };

  const applyPreset = (text: string) => {
    setInstructions(text);
  };

  const grails = myGarments.filter(g => g.is_grail);
  const unpinnedGarments = myGarments.filter(g => !g.is_grail);
  const selectedGarment = myGarments.find(g => g.id === selectedGarmentId);

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

      <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        {/* Title Section */}
        <div className="border-b border-[#c9a96e]/10 pb-6">
          <h2 className="font-serif text-xs uppercase tracking-widest text-[#8a8070] mb-2">
            Settings & Portfolio
          </h2>
          <h1 className="font-serif text-4xl font-light tracking-wide text-[#f5f0e8]">
            Curator Settings
          </h1>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`p-4 text-sm font-serif rounded-sm flex items-center gap-3 transition-all duration-300 ${
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

        {/* Profile Card & Info Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Avatar & Bio */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-[#252118] border border-[#c9a96e]/10 p-6 rounded-sm shadow-md text-center flex flex-col items-center space-y-4">
              
              {/* Avatar Uploader Wrapper */}
              <div className="relative group rounded-full overflow-hidden w-24 h-24 border border-[#c9a96e]/20 bg-[#1a1814] flex items-center justify-center">
                {avatarPreview || avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview || avatarUrl!}
                    alt="Curator Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12 text-[#8a8070] stroke-[1.25]" />
                )}
                
                {/* Camera Overlay */}
                <label className="absolute inset-0 bg-[#1a1814]/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs text-[#c9a96e]">
                  <Camera className="h-4 w-4 mb-1" />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>

              {avatarFile && (
                <span className="text-[10px] text-[#c9a96e] bg-[#c9a96e]/10 px-2 py-0.5 rounded-full font-mono">
                  Pending Save
                </span>
              )}

              <div className="space-y-1 w-full min-w-0">
                <h3 className="font-serif text-lg text-[#f5f0e8] truncate">
                  {email.split('@')[0]}
                </h3>
                <p className="text-xs text-[#8a8070] font-mono truncate">
                  {email}
                </p>
              </div>

              {bio && (
                <p className="text-xs text-[#8a8070] italic leading-relaxed pt-2 border-t border-[#c9a96e]/10 w-full">
                  &ldquo;{bio}&rdquo;
                </p>
              )}
            </div>
            
            <div className="bg-[#252118]/60 border border-[#c9a96e]/5 p-6 rounded-sm text-xs text-[#8a8070] leading-relaxed space-y-3">
              <h4 className="font-serif text-xs text-[#c9a96e] uppercase tracking-wider">
                About Curator Portfolios
              </h4>
              <p>
                Upload a custom avatar and describe your clothing philosophy. These detail points set the editorial voice of your personal wardrobe.
              </p>
              <p>
                Pin your absolute best finds below to build your Grail Gallery and document their acquisition history.
              </p>
            </div>
          </div>

          {/* Right Columns: Forms for Bio and Custom Prompts */}
          <form onSubmit={handleSaveProfile} className="md:col-span-2 space-y-8">
            <div className="bg-[#252118] border border-[#c9a96e]/10 p-6 rounded-sm shadow-md space-y-6">
              
              {/* Bio Field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8070]">
                  Curator Bio
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Vintage archivist focusing on pre-1980s workwear and Japanese denim."
                  className="mt-2 block w-full border border-[#c9a96e]/20 bg-[#1a1814] px-4 py-3 text-sm text-[#f5f0e8] placeholder-[#8a8070]/30 outline-none transition-all focus:border-[#c9a96e] rounded-sm font-sans"
                />
              </div>

              {/* Wishlist Field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8070]">
                  Thrift Wishlist / Hunting List
                </label>
                <p className="text-[11px] text-[#8a8070] mt-1 leading-relaxed">
                  List items you are currently hunting for (one item per line). Gemini will look at this list to flag priority buys and suggest matching accessories/outfits.
                </p>
                <textarea
                  value={wishlist}
                  onChange={(e) => setWishlist(e.target.value)}
                  rows={3}
                  placeholder="e.g.&#10;70s Brown Leather Jacket&#10;Vintage Oxford Shirt&#10;Faded Black band tee"
                  className="mt-2 block w-full border border-[#c9a96e]/20 bg-[#1a1814] px-4 py-3 text-sm text-[#f5f0e8] placeholder-[#8a8070]/30 outline-none transition-all focus:border-[#c9a96e] rounded-sm font-sans leading-relaxed"
                />
              </div>

              {/* Custom Prompts Field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8070]">
                  AI Style Instructions
                </label>
                <p className="text-[11px] text-[#8a8070] mt-1 leading-relaxed">
                  Provide custom prompts for Gemini. Describe your preferred aesthetics, brands, fabrics, fits, or specific quality thresholds (e.g. *prefer 100% natural fibers*, *flag polyester*).
                </p>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="mt-3 block w-full min-h-[180px] border border-[#c9a96e]/20 bg-[#1a1814] px-4 py-3 text-sm text-[#f5f0e8] placeholder-[#8a8070]/30 outline-none transition-all focus:border-[#c9a96e] font-sans leading-relaxed rounded-sm"
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
                    Saving Portfolio...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Grail Gallery & Thrift Journal */}
        <div className="border-t border-[#c9a96e]/10 pt-10 space-y-8">
          <div className="flex items-center justify-between border-b border-[#c9a96e]/10 pb-4">
            <div>
              <h2 className="font-serif text-2xl font-light tracking-wide text-[#f5f0e8] flex items-center gap-2">
                <Star className="h-5 w-5 text-[#c9a96e] fill-[#c9a96e]" />
                Grail Gallery & Thrift Journal
              </h2>
              <p className="text-xs text-[#8a8070] mt-1">
                Showcase your best finds and log their discovery history.
              </p>
            </div>
            <span className="text-xs font-serif font-light text-[#8a8070]">
              {grails.length} {grails.length === 1 ? 'Grail' : 'Grails'} Pinned
            </span>
          </div>

          {/* Form to Pin a New Grail */}
          {unpinnedGarments.length > 0 ? (
            <form onSubmit={handlePinGrail} className="bg-[#252118] border border-[#c9a96e]/10 p-5 rounded-sm space-y-4 max-w-2xl">
              <h3 className="font-serif text-sm text-[#c9a96e] uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="h-4 w-4 text-[#c9a96e]" />
                Pin a Garment as a Grail
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#8a8070] mb-2">
                    Select Garment
                  </label>
                  <select
                    value={selectedGarmentId}
                    onChange={(e) => setSelectedGarmentId(e.target.value)}
                    required
                    className="block w-full border border-[#c9a96e]/20 bg-[#1a1814] px-3 py-2.5 text-xs text-[#f5f0e8] outline-none focus:border-[#c9a96e] rounded-sm"
                  >
                    <option value="">-- Select Item --</option>
                    {unpinnedGarments.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.subcategory || g.category} ({g.brand || 'Unknown'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#8a8070] mb-2">
                    Discovery Story / Finding Moment
                  </label>
                  <input
                    type="text"
                    value={pendingStory}
                    onChange={(e) => setPendingStory(e.target.value)}
                    required
                    placeholder="e.g. Scored for RM 15 at Bundle Station. 1980s Single-Stitch Tee."
                    className="block w-full border border-[#c9a96e]/20 bg-[#1a1814] px-4 py-2.5 text-xs text-[#f5f0e8] placeholder-[#8a8070]/30 outline-none focus:border-[#c9a96e] rounded-sm"
                  />
                </div>
              </div>

              {/* Item preview if selected */}
              {selectedGarment && (
                <div className="flex items-center gap-3 bg-[#1a1814]/50 p-2 border border-[#c9a96e]/5 rounded-sm">
                  {selectedGarment.image_urls?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedGarment.image_urls[0]}
                      alt="Preview"
                      className="w-12 h-16 object-cover rounded-sm border border-[#c9a96e]/20"
                    />
                  )}
                  <div className="text-xs">
                    <span className="font-serif font-medium text-[#f5f0e8]">
                      {selectedGarment.subcategory || selectedGarment.category}
                    </span>
                    <span className="block text-[10px] text-[#8a8070] capitalize">
                      {selectedGarment.brand || 'Vintage Brand'} &bull; {selectedGarment.era || 'Era Unknown'}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={pinning || !selectedGarmentId}
                  className="inline-flex items-center gap-1.5 border border-[#c9a96e]/40 hover:border-[#c9a96e] bg-transparent px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#c9a96e] transition-colors rounded-sm cursor-pointer disabled:opacity-30"
                >
                  {pinning ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Star className="h-3 w-3 fill-[#c9a96e]" />
                  )}
                  Pin Grail
                </button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-[#8a8070] italic">
              All your items are currently pinned as Grails, or your wardrobe is empty. Go to Wardrobe to upload items!
            </p>
          )}

          {/* Grail Gallery Grid */}
          {grails.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {grails.map((grail) => {
                const isEditing = editingStoryId === grail.id;

                return (
                  <div
                    key={grail.id}
                    className="bg-[#252118] border border-[#c9a96e]/20 p-5 rounded-sm flex flex-col sm:flex-row gap-5 shadow-lg relative group overflow-hidden"
                  >
                    {/* Unpin Float Button */}
                    <button
                      onClick={() => handleUnpinGrail(grail.id)}
                      className="absolute top-3 right-3 text-[#8a8070] hover:text-[#rose-400] hover:bg-[#1a1814]/80 p-1.5 rounded-full transition-all cursor-pointer"
                      title="Unpin Grail"
                    >
                      <Trash2 className="h-4 w-4 text-rose-400" />
                    </button>

                    {/* Image Area */}
                    <div className="w-full sm:w-28 aspect-[3/4] bg-[#1a1814] border border-[#c9a96e]/10 rounded-sm overflow-hidden flex-shrink-0">
                      {grail.image_urls?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={grail.image_urls[0]}
                          alt={grail.subcategory || grail.category}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Tag className="h-8 w-8 text-[#8a8070]/40" />
                        </div>
                      )}
                    </div>

                    {/* Content Details Area */}
                    <div className="flex-1 flex flex-col justify-between space-y-4 min-w-0">
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#c9a96e] bg-[#c9a96e]/10 px-2 py-0.5 rounded-full border border-[#c9a96e]/10">
                          {grail.brand || 'Vintage Archive'}
                        </span>
                        <h4 className="font-serif text-lg font-light text-[#f5f0e8] truncate pt-1">
                          {grail.subcategory || grail.category}
                        </h4>
                        <div className="text-[10px] text-[#8a8070] flex items-center gap-1.5">
                          <span>Era: {grail.era || 'N/A'}</span>
                          <span>&bull;</span>
                          <span>Price: {grail.purchase_price ? `RM ${grail.purchase_price.toFixed(2)}` : 'N/A'}</span>
                        </div>
                      </div>

                      {/* Story Text Box / Editor */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="block text-[9px] font-semibold uppercase tracking-wider text-[#8a8070]">
                            Thrift Moment / Discovery Story
                          </span>
                          {!isEditing ? (
                            <button
                              onClick={() => {
                                setEditingStoryId(grail.id);
                                setTempStory(grail.discovery_story || '');
                              }}
                              className="text-[10px] text-[#c9a96e] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <PenSquare className="h-3 w-3" /> Edit Story
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveStory(grail.id)}
                                className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <Check className="h-3 w-3" /> Save
                              </button>
                              <button
                                onClick={() => setEditingStoryId(null)}
                                className="text-[10px] text-rose-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <X className="h-3 w-3" /> Cancel
                              </button>
                            </div>
                          )}
                        </div>

                        {!isEditing ? (
                          <p className="text-xs text-[#f5f0e8] italic leading-relaxed bg-[#1a1814]/40 border border-[#c9a96e]/5 p-3 rounded-sm font-serif">
                            &ldquo;{grail.discovery_story || 'No story details added yet.'}&rdquo;
                          </p>
                        ) : (
                          <textarea
                            value={tempStory}
                            onChange={(e) => setTempStory(e.target.value)}
                            rows={2}
                            className="block w-full border border-[#c9a96e]/20 bg-[#1a1814] px-3 py-2 text-xs text-[#f5f0e8] placeholder-[#8a8070]/30 outline-none focus:border-[#c9a96e] rounded-sm font-sans"
                            placeholder="Tell the story of how you acquired this grail..."
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center bg-[#252118]/40 border border-[#c9a96e]/5 p-10 rounded-sm">
              <Star className="h-8 w-8 text-[#8a8070]/30 mx-auto mb-3" />
              <h3 className="font-serif text-base text-[#8a8070] font-light">No Pinned Grails</h3>
              <p className="text-xs text-[#8a8070]/70 mt-1 max-w-md mx-auto">
                Highlight your proudest vintage pieces and catalog finding stories to display them in this Curator Showcase.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
