import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  const rememberMe = cookieStore.get('sb-remember-me')?.value === 'true';

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const finalOptions = { ...options };
              if (!rememberMe) {
                delete finalOptions.maxAge;
              }
              cookieStore.set(name, value, {
                ...finalOptions,
                secure: process.env.NODE_ENV === 'production',
              });
            });
          } catch {
            // The `setAll` method can be called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
      cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
      },
    }
  );
}
