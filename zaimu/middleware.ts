import { NextRequest, NextResponse } from "next/server";

// ── Demo / local-dev mode ─────────────────────────────────────────────────────
// When CLERK_SECRET_KEY is absent, bypass authentication entirely.
// This lets the app run for demos and local development without a Clerk account.
const isDemoMode = !process.env.CLERK_SECRET_KEY;

// Dynamically import Clerk only when keys are present to avoid init-time errors.
async function getClerkMiddleware() {
  const { clerkMiddleware, createRouteMatcher } = await import(
    "@clerk/nextjs/server"
  );

  const isPublicRoute = createRouteMatcher([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/fx(.*)",
  ]);
  const isApiRoute = createRouteMatcher(["/api(.*)"]);

  return clerkMiddleware(async (auth, req) => {
    if (isPublicRoute(req)) return;

    if (isApiRoute(req)) {
      const { userId } = await auth();
      if (!userId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return;
    }

    await auth.protect();
  });
}

// Cache the clerk handler (created once per worker process)
let clerkHandler: ((req: NextRequest) => Promise<NextResponse>) | null = null;

export default async function middleware(req: NextRequest): Promise<NextResponse> {
  if (isDemoMode) return NextResponse.next();

  if (!clerkHandler) {
    clerkHandler = await getClerkMiddleware() as unknown as typeof clerkHandler;
  }
  return clerkHandler!(req) as unknown as NextResponse;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
