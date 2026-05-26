'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  useEffect(() => {
    setDebugLogs((prev) => [...prev, '⚡ Client JS initialized']);
    
    const handleError = (e: ErrorEvent) => {
      setDebugLogs((prev) => [...prev, `❌ Error: ${e.message} at ${e.filename}:${e.lineno}`]);
    };
    
    const handleRejection = (e: PromiseRejectionEvent) => {
      setDebugLogs((prev) => [...prev, `❌ Promise Reject: ${JSON.stringify(e.reason)}`]);
    };

    // Override console.log and console.error to show them on screen
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      originalLog(...args);
      setDebugLogs((prev) => [...prev, `📝 Log: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`]);
    };

    console.error = (...args) => {
      originalError(...args);
      setDebugLogs((prev) => [...prev, `❌ Console Error: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`]);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🔑 handleAuth started. Mode: " + (isSignUp ? "SignUp" : "SignIn") + ", Email: " + email);
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage({
          type: 'success',
          text: 'Account created! Please check your email for the confirmation link.',
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/wardrobe');
        router.refresh();
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'An error occurred during authentication.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 lg:px-8 bg-[#1a1814]">
      <div className="w-full max-w-md space-y-8 border border-[#c9a96e]/20 bg-[#252118] p-8 md:p-10 shadow-2xl rounded-sm">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="font-serif text-5xl tracking-widest text-[#c9a96e] select-none">
            ASKLEE
          </h1>
          <p className="mt-3 font-serif text-sm italic text-[#8a8070]">
            Personal Wardrobe & Curator
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="flex border-b border-[#c9a96e]/10">
          <button
            type="button"
            onClick={() => {
              console.log("👉 Tapped Sign In tab");
              setIsSignUp(false);
              setMessage(null);
            }}
            className={`flex-1 pb-3 text-sm font-medium transition-all cursor-pointer ${
              !isSignUp
                ? 'border-b-2 border-[#c9a96e] text-[#f5f0e8]'
                : 'text-[#8a8070] hover:text-[#f5f0e8]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              console.log("👉 Tapped Register tab");
              setIsSignUp(true);
              setMessage(null);
            }}
            className={`flex-1 pb-3 text-sm font-medium transition-all cursor-pointer ${
              isSignUp
                ? 'border-b-2 border-[#c9a96e] text-[#f5f0e8]'
                : 'text-[#8a8070] hover:text-[#f5f0e8]'
            }`}
          >
            Register
          </button>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`p-4 text-sm font-serif rounded-sm ${
              message.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-950/40 text-rose-400 border border-rose-500/20'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[#8a8070]">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 block w-full border border-[#c9a96e]/20 bg-[#1a1814] px-4 py-3 text-base md:text-sm text-[#f5f0e8] placeholder-[#8a8070]/50 outline-none transition-all focus:border-[#c9a96e]"
              placeholder="e.g. name@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-[#8a8070]">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 block w-full border border-[#c9a96e]/20 bg-[#1a1814] px-4 py-3 text-base md:text-sm text-[#f5f0e8] placeholder-[#8a8070]/50 outline-none transition-all focus:border-[#c9a96e]"
              placeholder="••••••••"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center border border-[#c9a96e] bg-transparent px-4 py-3 text-sm font-semibold uppercase tracking-widest text-[#c9a96e] transition-all hover:bg-[#c9a96e] hover:text-[#1a1814] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* On-screen Debug Log */}
      <div className="mt-8 w-full max-w-md border border-amber-500/30 bg-[#252118] p-4 rounded-sm font-mono text-xs text-zinc-300 shadow-xl">
        <div className="flex justify-between border-b border-amber-500/20 pb-2 mb-2">
          <span className="text-amber-400 uppercase tracking-wider font-bold">Mobile Debug Console</span>
          <button 
            type="button" 
            onClick={() => setDebugLogs([])} 
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            [Clear]
          </button>
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {debugLogs.length === 0 ? (
            <div className="text-zinc-500 italic">No logs yet. Tap buttons or inputs to capture events...</div>
          ) : (
            debugLogs.map((log, idx) => (
              <div key={idx} className="break-all border-b border-zinc-800/30 pb-0.5">{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
