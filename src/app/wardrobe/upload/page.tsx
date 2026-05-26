'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/utils/supabase/client';
import Navigation from '@/components/Navigation';
import { Upload, Loader2, Save, X } from 'lucide-react';

interface AnalyzedGarment {
  category: 'tops' | 'bottoms' | 'footwear' | 'shoes' | 'accessories';
  subcategory: string;
  brand: string | null;
  era: string | null;
  colours: string[];
  fabrics: string[];
  is_natural_fibre: boolean;
  tags: string[];
  ai_summary: string;
}

export default function UploadPage() {
  const router = useRouter();
  const supabase = createClient();

  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State (initialized with empty values, loaded after Gemini analyzes)
  const [formData, setFormData] = useState<Partial<AnalyzedGarment> & { notes: string; purchase_price: string }>({
    category: 'tops',
    subcategory: '',
    brand: '',
    era: 'Contemporary',
    colours: [],
    fabrics: [],
    is_natural_fibre: false,
    tags: [],
    ai_summary: '',
    notes: '',
    purchase_price: '',
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
    setCompressing(true);

    try {
      // 1. Client-side Image Compression (target size < 500KB)
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      setImage(compressedFile);

      // Convert file to base64 for Gemini vision upload
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        
        // 2. Trigger Gemini Vision Auto-Tagging API
        setAnalyzing(true);
        try {
          const res = await fetch('/api/gemini/analyse-garment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64Data,
              mimeType: compressedFile.type,
            }),
          });
          const result = await res.json();
          if (result.error) throw new Error(result.error);

          const data: AnalyzedGarment = result.data;
          setFormData((prev) => ({
            ...prev,
            category: data.category || 'tops',
            subcategory: data.subcategory || '',
            brand: data.brand || '',
            era: data.era || 'Contemporary',
            colours: data.colours || [],
            fabrics: data.fabrics || [],
            is_natural_fibre: !!data.is_natural_fibre,
            tags: data.tags || [],
            ai_summary: data.ai_summary || '',
          }));
        } catch (err) {
          console.error('Gemini analysis failed:', err);
          alert('AI analysis failed, but you can fill in the garment details manually.');
        } finally {
          setAnalyzing(false);
        }
      };
    } catch (error) {
      console.error('Compression failed:', error);
      alert('Failed to compress image.');
    } finally {
      setCompressing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
      alert('Please upload a garment image first.');
      return;
    }

    setSaving(true);

    try {
      // 1. Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated.');

      // 2. Upload photo to Supabase Storage
      const fileExt = image.type.split('/')[1] || 'jpg';
      const garmentId = crypto.randomUUID();
      const filePath = `${user.id}/${garmentId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('garments')
        .upload(filePath, image);

      if (uploadError) throw uploadError;

      // 3. Retrieve Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('garments')
        .getPublicUrl(filePath);

      // 4. Save metadata to Supabase DB Table
      const { error: dbError } = await supabase.from('garments').insert({
        id: garmentId,
        user_id: user.id,
        image_urls: [publicUrl],
        category: formData.category,
        subcategory: formData.subcategory || null,
        brand: formData.brand || null,
        era: formData.era || null,
        colours: formData.colours,
        fabrics: formData.fabrics,
        is_natural_fibre: formData.is_natural_fibre,
        tags: formData.tags,
        notes: formData.notes || null,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        ai_summary: formData.ai_summary || null,
        worn_count: 0,
      });

      if (dbError) throw dbError;

      router.push('/wardrobe');
      router.refresh();
    } catch (err) {
      console.error('Error saving garment:', err);
      alert(err instanceof Error ? err.message : 'Failed to save garment.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setPreview(null);
    setFormData({
      category: 'tops',
      subcategory: '',
      brand: '',
      era: 'Contemporary',
      colours: [],
      fabrics: [],
      is_natural_fibre: false,
      tags: [],
      ai_summary: '',
      notes: '',
      purchase_price: '',
    });
  };

  return (
    <div className="min-h-screen bg-[#1a1814] text-[#f5f0e8] flex flex-col">
      <Navigation />

      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-12 sm:px-6">
        {/* Title Section */}
        <div className="border-b border-[#c9a96e]/10 pb-6 mb-10">
          <h2 className="font-serif text-xs uppercase tracking-widest text-[#8a8070] mb-2">
            Cataloguing
          </h2>
          <h1 className="font-serif text-4xl font-light tracking-wide text-[#f5f0e8]">
            Add New Garment
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Left: Image Upload & Preview */}
          <div className="space-y-6">
            {!preview ? (
              <div
                {...getRootProps()}
                className={`flex flex-col items-center justify-center border-2 border-dashed aspect-[3/4] transition-all rounded-sm cursor-pointer ${
                  isDragActive
                    ? 'border-[#c9a96e] bg-[#252118]'
                    : 'border-[#c9a96e]/20 bg-[#252118]/40 hover:border-[#c9a96e]/40'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-10 w-10 text-[#8a8070] mb-4 stroke-[1.25]" />
                <p className="text-sm text-[#f5f0e8] font-medium">Drag & drop photo here</p>
                <p className="text-xs text-[#8a8070] mt-1">or click to browse files</p>
              </div>
            ) : (
              <div className="relative aspect-[3/4] bg-[#252118] border border-[#c9a96e]/20 rounded-sm overflow-hidden group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Garment Preview" className="h-full w-full object-cover object-center" />
                
                {/* Reset button */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="absolute top-4 right-4 bg-[#1a1814]/80 text-[#f5f0e8] p-2 hover:bg-[#1a1814] hover:text-[#c9a96e] transition-all rounded-full cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Processing Overlay */}
                {(compressing || analyzing) && (
                  <div className="absolute inset-0 bg-[#1a1814]/85 flex flex-col items-center justify-center p-6 text-center">
                    <Loader2 className="h-10 w-10 text-[#c9a96e] animate-spin mb-4" />
                    <h3 className="font-serif text-lg text-[#c9a96e]">
                      {compressing ? 'Compressing image...' : 'AI Auto-Tagging...'}
                    </h3>
                    <p className="text-xs text-[#8a8070] mt-2 max-w-xs leading-relaxed">
                      Gemini is identifying fabrics, category, estimated era, brand, and natural fiber details.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: AI Auto-Tagged Metadata Edit Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8070]">
                AI Summary Description
              </label>
              <textarea
                value={formData.ai_summary || ''}
                onChange={(e) => setFormData({ ...formData, ai_summary: e.target.value })}
                rows={2}
                disabled={analyzing}
                className="mt-2 block w-full border border-[#c9a96e]/20 bg-[#252118] px-4 py-3 text-[#f5f0e8] placeholder-[#8a8070]/30 outline-none transition-all focus:border-[#c9a96e] rounded-sm italic font-serif text-sm"
                placeholder={analyzing ? 'Gemini is drafting summary...' : 'One-sentence summary description...'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8070]">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as 'tops' | 'bottoms' | 'footwear' | 'shoes' | 'accessories' })}
                  className="mt-2 block w-full border border-[#c9a96e]/20 bg-[#252118] px-4 py-3 text-[#f5f0e8] outline-none transition-all focus:border-[#c9a96e] rounded-sm text-sm"
                >
                  <option value="tops">Tops</option>
                  <option value="bottoms">Bottoms</option>
                  <option value="footwear">Footwear</option>
                  <option value="shoes">Shoes</option>
                  <option value="accessories">Accessories</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8070]">
                  Subcategory
                </label>
                <input
                  type="text"
                  value={formData.subcategory || ''}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  placeholder="e.g. Oxford shirt"
                  className="mt-2 block w-full border border-[#c9a96e]/20 bg-[#252118] px-4 py-3 text-[#f5f0e8] placeholder-[#8a8070]/30 outline-none transition-all focus:border-[#c9a96e] rounded-sm text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8070]">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand || ''}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="e.g. Ralph Lauren"
                  className="mt-2 block w-full border border-[#c9a96e]/20 bg-[#252118] px-4 py-3 text-[#f5f0e8] placeholder-[#8a8070]/30 outline-none transition-all focus:border-[#c9a96e] rounded-sm text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8070]">
                  Era Estimate
                </label>
                <input
                  type="text"
                  value={formData.era || ''}
                  onChange={(e) => setFormData({ ...formData, era: e.target.value })}
                  placeholder="e.g. 1980s"
                  className="mt-2 block w-full border border-[#c9a96e]/20 bg-[#252118] px-4 py-3 text-[#f5f0e8] placeholder-[#8a8070]/30 outline-none transition-all focus:border-[#c9a96e] rounded-sm text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8070]">
                  Fabrics
                </label>
                <input
                  type="text"
                  value={formData.fabrics?.join(', ') || ''}
                  onChange={(e) => setFormData({ ...formData, fabrics: e.target.value.split(',').map(s => s.trim()) })}
                  placeholder="e.g. 100% Wool, Cotton"
                  className="mt-2 block w-full border border-[#c9a96e]/20 bg-[#252118] px-4 py-3 text-[#f5f0e8] placeholder-[#8a8070]/30 outline-none transition-all focus:border-[#c9a96e] rounded-sm text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8070]">
                  Colours
                </label>
                <input
                  type="text"
                  value={formData.colours?.join(', ') || ''}
                  onChange={(e) => setFormData({ ...formData, colours: e.target.value.split(',').map(s => s.trim()) })}
                  placeholder="e.g. Navy, Cream"
                  className="mt-2 block w-full border border-[#c9a96e]/20 bg-[#252118] px-4 py-3 text-[#f5f0e8] placeholder-[#8a8070]/30 outline-none transition-all focus:border-[#c9a96e] rounded-sm text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#252118] border border-[#c9a96e]/10 px-4 py-3 rounded-sm">
              <input
                id="is_natural_fibre"
                type="checkbox"
                checked={!!formData.is_natural_fibre}
                onChange={(e) => setFormData({ ...formData, is_natural_fibre: e.target.checked })}
                className="h-4 w-4 border-[#c9a96e]/20 bg-[#1a1814] text-[#c9a96e] focus:ring-0 focus:ring-offset-0 rounded-sm cursor-pointer"
              />
              <label htmlFor="is_natural_fibre" className="text-xs font-semibold uppercase tracking-wider text-[#f5f0e8] cursor-pointer select-none">
                Pure Natural Fibre (Wool, Linen, Cotton, Silk)
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8070]">
                  Purchase Price (MYR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  placeholder="e.g. 120"
                  className="mt-2 block w-full border border-[#c9a96e]/20 bg-[#252118] px-4 py-3 text-[#f5f0e8] placeholder-[#8a8070]/30 outline-none transition-all focus:border-[#c9a96e] rounded-sm text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8070]">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags?.join(', ') || ''}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(s => s.trim()) })}
                  placeholder="e.g. vintage, tailoring"
                  className="mt-2 block w-full border border-[#c9a96e]/20 bg-[#252118] px-4 py-3 text-[#f5f0e8] placeholder-[#8a8070]/30 outline-none transition-all focus:border-[#c9a96e] rounded-sm text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8070]">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Details about fit, store bought from, styling thoughts..."
                className="mt-2 block w-full border border-[#c9a96e]/20 bg-[#252118] px-4 py-3 text-[#f5f0e8] placeholder-[#8a8070]/30 outline-none transition-all focus:border-[#c9a96e] rounded-sm text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={saving || analyzing || compressing || !image}
              className="w-full inline-flex items-center justify-center gap-2 border border-[#c9a96e] bg-[#c9a96e] py-3.5 text-xs font-semibold uppercase tracking-widest text-[#1a1814] transition-all hover:bg-transparent hover:text-[#c9a96e] disabled:opacity-50 disabled:pointer-events-none rounded-sm cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-current" />
                  Saving to Closet...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Garment
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
