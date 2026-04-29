/**
 * isDemoMode — central truth for whether the current user should see demo data.
 *
 * Rules:
 *  1. NEVER demo for real production users (exclusion list by email).
 *  2. Demo ONLY when the user's organization slug is exactly 'demo'.
 *  3. The old "isSuperAdmin + no data" fallback is REMOVED — it caused
 *     production accounts like nedpearson@gmail.com to see fake data
 *     whenever their real data happened to be zero.
 */

/** Emails that must NEVER see demo data, regardless of org or data state. */
const PRODUCTION_EMAILS = new Set([
  'nedpearson@gmail.com',
]);

/**
 * Returns true only when the user should see demo/preview data.
 *
 * @param user - the current user object from the auth store
 */
export function isDemoMode(user: {
  email?: string;
  organization?: { slug?: string } | null;
} | null | undefined): boolean {
  if (!user) return false;

  // Hard exclude known production accounts — they NEVER see demo data.
  if (user.email && PRODUCTION_EMAILS.has(user.email.toLowerCase())) {
    return false;
  }

  // Only show demo data for the explicit demo organisation.
  return user?.organization?.slug === 'demo';
}
