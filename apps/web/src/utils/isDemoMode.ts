/**
 * isDemoMode — single source of truth for demo data rendering.
 *
 * STRICT RULE: demo data is shown ONLY when the user's organisation
 * slug is exactly 'demo'. No fallbacks. No empty-data heuristics.
 *
 * Production accounts (nedpearson@gmail.com) are hard-excluded
 * regardless of any other condition.
 *
 * Usage:
 *   isDemoMode(user)   → boolean
 */

/** Emails that must NEVER see demo data under any circumstances. */
const PRODUCTION_EMAILS = new Set([
  'nedpearson@gmail.com',
]);

/**
 * Returns true only when the user belongs to the dedicated demo organisation.
 *
 * @param user - the current user object from the auth store
 */
export function isDemoMode(
  user: {
    email?: string;
    organization?: { slug?: string } | null;
  } | null | undefined,
): boolean {
  if (!user) return false;

  // Hard-block production owner accounts. Always false, no exceptions.
  if (user.email && PRODUCTION_EMAILS.has(user.email.toLowerCase())) {
    return false;
  }

  // Only the dedicated demo org sees demo data.
  // Thomas Broussard is in orgReal and sees real seeded DB data via API.
  // No "hasNoData" fallback — empty state is correct for fresh accounts.
  return user?.organization?.slug === 'demo';
}
