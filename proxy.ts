import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const pathname = nextUrl.pathname;

  // All /api/ routes handle their own auth — bypass proxy entirely
  if (pathname.startsWith("/api/")) return NextResponse.next();
  const isLoggedIn = !!session;

  // Public routes
  const publicPaths = ["/", "/login", "/register"];
  const isPublicPath = publicPaths.some((p) => pathname === p || pathname.startsWith("/api/auth"));

  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/discover", nextUrl));
  }

  // Onboarding gating
  if (isLoggedIn) {
    const step = session?.user?.onboardingStep;
    const isOnboarding = pathname.startsWith("/onboarding");
    const isApp = ["/discover", "/matches", "/profile", "/settings"].some((p) =>
      pathname.startsWith(p)
    );

    if (isApp && step !== "COMPLETE") {
      const stepRoutes: Record<string, string> = {
        PROFILE_SETUP: "/onboarding/profile-setup",
        QUESTIONNAIRE: "/onboarding/questionnaire",
        PRIORITIES: "/onboarding/priorities",
      };
      const redirect = stepRoutes[step ?? "PROFILE_SETUP"] ?? "/onboarding/profile-setup";
      return NextResponse.redirect(new URL(redirect, nextUrl));
    }

    if (isOnboarding && step === "COMPLETE") {
      return NextResponse.redirect(new URL("/discover", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
