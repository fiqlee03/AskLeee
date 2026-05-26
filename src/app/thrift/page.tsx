'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import Navigation from '@/components/Navigation';
import { Upload, Loader2, Award, AlertTriangle, CheckCircle2, CircleDollarSign, Compass, FileText, X } from 'lucide-react';

interface ThriftAnalysisResult {
  verdict: 'BUY' | 'PASS' | 'CONSIDER';
  confidenceScore: number;
  brandAssessment: string;
  fibreAnalysis: string;
  eraEstimate: string;
  qualitySignals: string[];
  redFlags: string[];
  maxFairPrice: number | null;
  reasoning: string;
}

export default function ThriftModePage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ThriftAnalysisResult | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setResult(null);
    setCompressing(true);

    try {
      // 1. Client-side Image Compression (target size < 500KB)
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);

      // Convert file to base64 for Gemini vision upload
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        // The API route expects an array of objects containing { imageBase64, mimeType }
        const imagePayload = [{
          imageBase64: base64Data.split(',')[1], // Extract only the raw base64 string
          mimeType: compressedFile.type,
        }];

        // 2. Trigger Thrift Authentication API
        setAnalyzing(true);
        try {
          const res = await fetch('/api/gemini/thrift-analyse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: imagePayload }),
          });
          const apiResult = await res.json();
          if (apiResult.error) throw new Error(apiResult.error);

          setResult(apiResult.data);
        } catch (err) {
          console.error('Thrift analysis failed:', err);
          alert('Failed to analyze the thrift item. Please try again.');
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

  const handleReset = () => {
    setPreview(null);
    setResult(null);
  };

  const getVerdictStyles = (verdict: 'BUY' | 'PASS' | 'CONSIDER') => {
    switch (verdict) {
      case 'BUY':
        return {
          bg: 'bg-emerald-950/20',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          accent: 'bg-emerald-500/10',
          label: 'Must Buy',
        };
      case 'PASS':
        return {
          bg: 'bg-rose-950/20',
          border: 'border-rose-500/30',
          text: 'text-rose-400',
          accent: 'bg-rose-500/10',
          label: 'Pass / Skip',
        };
      case 'CONSIDER':
      default:
        return {
          bg: 'bg-amber-950/20',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          accent: 'bg-amber-500/10',
          label: 'Consider / Tweak',
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1814] text-[#f5f0e8] flex flex-col">
      <Navigation />

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-12 sm:px-6">
        {/* Title Section */}
        <div className="border-b border-[#c9a96e]/10 pb-6 mb-10">
          <h2 className="font-serif text-xs uppercase tracking-widest text-[#8a8070] mb-2">
            Intelligence Mode
          </h2>
          <h1 className="font-serif text-4xl font-light tracking-wide text-[#f5f0e8]">
            Thrift Intelligence
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Image Ingest */}
          <div className="lg:col-span-4 space-y-6">
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
                <p className="text-sm text-[#f5f0e8] font-medium text-center px-4">
                  Drag & drop label / care tag photo here
                </p>
                <p className="text-xs text-[#8a8070] mt-1">or click to browse files</p>
              </div>
            ) : (
              <div className="relative aspect-[3/4] bg-[#252118] border border-[#c9a96e]/20 rounded-sm overflow-hidden group shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Vintage Item Preview" className="h-full w-full object-cover object-center" />
                
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
                      {compressing ? 'Optimizing photo...' : 'Extracting Vintage Clues...'}
                    </h3>
                    <p className="text-xs text-[#8a8070] mt-2 max-w-xs leading-relaxed">
                      Gemini Pro is running authenticating logic on care tags, fonts, seams, and materials.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Analysis Output */}
          <div className="lg:col-span-8">
            {!result && !analyzing && !compressing ? (
              <div className="flex flex-col items-center justify-center border border-[#c9a96e]/10 bg-[#252118]/50 p-10 h-full text-center rounded-sm min-h-[300px]">
                <Award className="h-12 w-12 text-[#8a8070]/60 mb-4 stroke-[1.25]" />
                <h2 className="font-serif text-2xl text-[#f5f0e8] mb-2 font-light">
                  Ready to Authenticate
                </h2>
                <p className="text-sm text-[#8a8070] max-w-md leading-relaxed">
                  Upload tags, brand embroidery, care labels, or zipper details. Gemini Pro analyzes font styling, material weave, and stitching styles to verify vintage pedigree.
                </p>
              </div>
            ) : analyzing || compressing ? (
              <div className="flex flex-col items-center justify-center border border-[#c9a96e]/10 bg-[#252118] p-10 h-full text-center rounded-sm min-h-[300px]">
                <Loader2 className="h-12 w-12 text-[#c9a96e] animate-spin mb-4" />
                <h2 className="font-serif text-2xl text-[#c9a96e] mb-2 font-light">
                  AI Vintage Reasoning Active
                </h2>
                <p className="text-sm text-[#8a8070] max-w-md leading-relaxed">
                  Cross-referencing heritage tags and fiber weaves. This may take a few seconds due to high-precision reasoning parameters.
                </p>
              </div>
            ) : (
              result && (
                <div className="space-y-6">
                  {/* Verdict Banner Card */}
                  <div className={`border ${getVerdictStyles(result.verdict).border} ${getVerdictStyles(result.verdict).bg} p-6 rounded-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xl`}>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#8a8070] block">
                        Vintage Recommendation Verdict
                      </span>
                      <h2 className={`font-serif text-4xl font-light mt-1 ${getVerdictStyles(result.verdict).text}`}>
                        {getVerdictStyles(result.verdict).label}
                      </h2>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Confidence Score Gauge */}
                      <div className="bg-[#1a1814]/80 border border-[#c9a96e]/15 px-4 py-2 rounded-sm text-center">
                        <span className="block text-[9px] uppercase tracking-wider text-[#8a8070]">
                          AI Confidence
                        </span>
                        <span className="font-serif text-lg font-bold text-[#c9a96e]">
                          {result.confidenceScore}%
                        </span>
                      </div>

                      {/* Suggested Ceiling Price */}
                      {result.maxFairPrice && (
                        <div className="bg-[#1a1814]/80 border border-[#c9a96e]/15 px-4 py-2 rounded-sm text-center">
                          <span className="block text-[9px] uppercase tracking-wider text-[#8a8070]">
                            Max Fair Price
                          </span>
                          <span className="font-serif text-lg font-bold text-[#f5f0e8]">
                            RM {result.maxFairPrice}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Specification Breakdown Card */}
                  <div className="bg-[#252118] border border-[#c9a96e]/10 p-6 rounded-sm space-y-6 shadow-md">
                    
                    {/* Verdict Reasoning Description */}
                    <div>
                      <h4 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#8a8070] mb-2 border-b border-[#c9a96e]/5 pb-2">
                        <FileText className="h-3.5 w-3.5 text-[#c9a96e]" />
                        Verdict Reasoning
                      </h4>
                      <p className="text-sm text-[#f5f0e8] leading-relaxed font-serif italic">
                        &ldquo;{result.reasoning}&rdquo;
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Brand Heritage Assessment */}
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#8a8070] border-b border-[#c9a96e]/5 pb-2">
                          <Award className="h-3.5 w-3.5 text-[#c9a96e]" />
                          Brand & Heritage Tier
                        </h4>
                        <p className="text-xs text-[#8a8070] leading-relaxed">
                          {result.brandAssessment}
                        </p>
                      </div>

                      {/* Fabric / Fibre Assessment */}
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#8a8070] border-b border-[#c9a96e]/5 pb-2">
                          <CircleDollarSign className="h-3.5 w-3.5 text-[#c9a96e]" />
                          Fiber & Composition Quality
                        </h4>
                        <p className="text-xs text-[#8a8070] leading-relaxed">
                          {result.fibreAnalysis}
                        </p>
                      </div>
                    </div>

                    {/* Era Estimate */}
                    <div className="bg-[#1a1814]/40 border border-[#c9a96e]/5 p-4 rounded-sm flex items-start gap-3">
                      <Compass className="h-5 w-5 text-[#c9a96e] shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-semibold text-[#f5f0e8]">Era Estimate</h5>
                        <p className="text-xs text-[#8a8070] mt-1 leading-relaxed">{result.eraEstimate}</p>
                      </div>
                    </div>

                    {/* Quality Signals & Red Flags lists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#c9a96e]/5">
                      
                      {/* Quality signals */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-2">
                          Quality Signals
                        </h4>
                        {result.qualitySignals?.length === 0 ? (
                          <p className="text-xs text-[#8a8070] italic">None identified.</p>
                        ) : (
                          <ul className="space-y-2">
                            {result.qualitySignals.map((sig, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-[#8a8070] leading-relaxed">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                {sig}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Red Flags */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-rose-400 mb-2">
                          Red Flags
                        </h4>
                        {result.redFlags?.length === 0 ? (
                          <p className="text-xs text-[#8a8070] italic">No warnings or synthetic concerns found.</p>
                        ) : (
                          <ul className="space-y-2">
                            {result.redFlags.map((flag, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-[#8a8070] leading-relaxed">
                                <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                                {flag}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
