import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { isDemoMode } from '../mode';

export async function updateSession(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do NOT remove this, as it refreshes the session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes check: /app, /app/timeline, etc.
  const isAppRoute = request.nextUrl.pathname.startsWith('/app');
  const isAuthRoute = ['/login', '/register', '/forgot-password'].includes(request.nextUrl.pathname);

  if (isAppRoute && !user) {
    // Redirect to login if user is not authenticated
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    // Redirect to dashboard if logged-in user tries to visit login/register
    const url = request.nextUrl.clone();
    url.pathname = '/app/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
