import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const rememberMe = request.cookies.get('sb-remember-me')?.value === 'true';

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            const finalOptions = { ...options };
            if (!rememberMe) {
              delete finalOptions.maxAge;
            }
            supabaseResponse.cookies.set(name, value, {
              ...finalOptions,
              secure: process.env.NODE_ENV === 'production',
            });
          });
        },
      },
      cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
      },
    }
  );

  // refreshing the auth token
  await supabase.auth.getUser();

  return supabaseResponse;
}
