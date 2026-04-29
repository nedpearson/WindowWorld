/**
 * isDemoMode — central truth for whether the current user should see demo data.
 *
 * Rules:
 *  1. NEVER demo for real production owner accounts (hard exclusion by email).
 *     Add any future production-only emails to PRODUCTION_EMAILS.
 *  2. Demo if the user's org slug is 'demo' (dedicated demo org).
 *  3. Demo if the user is NOT in PRODUCTION_EMAILS and has no real data yet
 *     (the isDemoFallback callers pass the zero-data flag).
 *
 * Usage:
 *   isDemoMode(user)                — org-slug check only (safe default)
 *   isDemoMode(user, hasNoData)     — also allows demo when DB is empty
 */

/** Emails that must NEVER see demo data, regardless of org or data state. */
const PRODUCTION_EMAILS = new Set([
  'nedpearson@gmail.com',
]);

/**
 * Returns true when the user should see demo/preview data.
 *
 * @param user       - the current user object from the auth store
 * @param hasNoData  - pass true when real DB records are zero/absent
 */
export function isDemoMode(
  user: {
    email?: string;
    organization?: { slug?: string } | null;
  } | null | undefined,
  hasNoData = false,
): boolean {
  if (!user) return false;

  // Hard exclude known production owner accounts — never see demo data.
  if (user.email && PRODUCTION_EMAILS.has(user.email.toLowerCase())) {
    return false;
  }

  // Dedicated demo organisation.
  if (user?.organization?.slug === 'demo') return true;

  // Any other user who has no real data yet → show demo preview.
  // This covers Thomas Broussard (orgReal, SALES_MANAGER) seeing the
  // seeded demo leads/appointments when the org has real data later.
  return hasNoData;
}
