import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    if (typeof window === 'undefined') return [];
                    return document.cookie.split(';').map(cookie => {
                        const parts = cookie.split('=');
                        return { name: parts[0].trim(), value: decodeURIComponent(parts[1] || '') };
                    });
                },
                setAll(cookiesToSet) {
                    if (typeof window === 'undefined') return;
                    const rememberMe = document.cookie.split(';').some(row => row.trim().startsWith('sb-remember-me=true'));
                    cookiesToSet.forEach(({ name, value, options }) => {
                        let cookieString = `${name}=${encodeURIComponent(value)}; path=/;`;
                        
                        if (rememberMe && options?.maxAge) {
                            cookieString += ` max-age=${options.maxAge};`;
                        }
                        if (options?.domain) {
                            cookieString += ` domain=${options.domain};`;
                        }
                        if (options?.secure || process.env.NODE_ENV === 'production') {
                            cookieString += ` secure;`;
                        }
                        if (options?.sameSite) {
                            cookieString += ` samesite=${options.sameSite};`;
                        }
                        document.cookie = cookieString;
                    });
                }
            },
            cookieOptions: {
                secure: process.env.NODE_ENV === 'production',
            },
        }
    );
}

