import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/setup"];
const AUTH_TIMEOUT_MS    = 4000;

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Fail fast if env vars are missing — avoids a cryptic crash deeper in the stack
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("[middleware] Missing Supabase environment variables");
    return NextResponse.next({ request }); // passthrough — app will show its own error
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Race auth check against a timeout so a slow/down Supabase doesn't
  // hang every page load. On timeout, passthrough — the page handles
  // its own auth state client-side.
  const timeout = new Promise<null>(resolve =>
    setTimeout(() => resolve(null), AUTH_TIMEOUT_MS)
  );
  const authResult = await Promise.race([
    supabase.auth.getUser().then(r => r.data.user),
    timeout,
  ]);

  const isProtected = PROTECTED_PREFIXES.some(p =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (!authResult && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/setup"],
};
