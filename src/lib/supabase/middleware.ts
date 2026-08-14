import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * Auth gate for the app zone. Only paths under `/app` require a session — the
 * marketing site (`/`, `/pricing`, `/about`, …) and the `/auth` endpoints stay
 * public. Within `/app`, unauthenticated users are sent to `/app/login` and
 * signed-in users are held at `/app/onboarding` until they finish onboarding.
 * Called from the root middleware only when Supabase is configured.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  // Only the app zone is gated. Everything else (marketing, /auth) is public.
  if (path !== "/app" && !path.startsWith("/app/")) return response;

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() revalidates the token with Supabase (don't trust getSession() here).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = path === "/app/login";
  const onOnboarding = path === "/app/onboarding";
  const redirect = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    return NextResponse.redirect(url);
  };

  if (!user) {
    if (isLogin) return response;
    // Preserve where they were headed so login can return them there (e.g. /app/go-pro).
    const url = request.nextUrl.clone();
    url.pathname = "/app/login";
    url.search = "";
    url.searchParams.set("next", path + (request.nextUrl.search || ""));
    return NextResponse.redirect(url);
  }

  // Signed in — no need to sit on the login screen.
  if (isLogin) return redirect("/app");

  // Onboarding gate: require a name and an accepted safety disclaimer.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, disclaimer_accepted_at")
    .eq("id", user.id)
    .maybeSingle();

  // Self-heal: a signed-in user with no profile row (e.g. an account created
  // before the auto-create trigger existed) gets one created now, so the Stripe
  // webhook and entitlement checks always have a row to target. They still pass
  // through onboarding below to set their name + disclaimer.
  if (!profile) {
    await supabase
      .from("profiles")
      .upsert({ id: user.id, email: user.email ?? null }, { onConflict: "id", ignoreDuplicates: true });
  }

  const onboarded = Boolean(profile?.display_name && profile?.disclaimer_accepted_at);

  if (!onboarded && !onOnboarding) return redirect("/app/onboarding");
  if (onboarded && onOnboarding) return redirect("/app");

  return response;
}
