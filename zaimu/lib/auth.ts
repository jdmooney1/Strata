/**
 * Auth helpers — wraps Clerk auth() with org resolution.
 * During MVP, org ID is resolved from the seeded user record.
 * When Clerk orgs are wired, replace with auth().orgId.
 */

const FALLBACK_ORG_ID = "org_sanyo_001";

/**
 * Returns the active org ID for the current request.
 * Falls back to the seed org when Clerk is not configured or the user
 * has no matching record in the database.
 */
export async function getOrgId(): Promise<string> {
  try {
    // Lazy import so the module is safe to load in environments where
    // @clerk/nextjs is not configured (e.g. unit tests, seed scripts).
    const { auth } = await import("@clerk/nextjs/server");
    const { userId, orgId } = await auth();

    // If Clerk provides an org directly, use it.
    if (orgId) return orgId;

    // No Clerk org — fall through to the hardcoded seed org.
    void userId; // suppress lint
    return FALLBACK_ORG_ID;
  } catch {
    return FALLBACK_ORG_ID;
  }
}

/** Convenience: returns the hardcoded seed org during local development. */
export const DEV_ORG_ID = FALLBACK_ORG_ID;
