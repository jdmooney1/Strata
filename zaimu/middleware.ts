import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that are always public (no auth needed)
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/fx(.*)",       // public FX fallback endpoint
]);

// API routes used by the upload/extraction flow — protected but not redirecting
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  // For API routes that aren't public, require auth but return 401 (not redirect)
  if (isApiRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return;
  }

  // Platform routes: redirect to sign-in if not authenticated
  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
