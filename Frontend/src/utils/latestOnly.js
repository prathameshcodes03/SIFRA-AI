/**
 * Latest-only guard for asynchronous work.
 *
 * The camera loop starts a prediction every 600ms. A response that arrives
 * after a newer one has already been dispatched describes a pose the user has
 * already moved out of, so it must never overwrite the newer decision.
 *
 * Extracted as a tiny pure unit so the guarantee is directly testable rather
 * than buried inside a React effect.
 */
export function createLatestOnlyGuard() {
  let current = 0;

  return {
    /**
     * Claim a slot for a new request.
     * @returns {number} token to hand back to `isCurrent`
     */
    issue: () => (current += 1),

    /** Is this token still the newest outstanding request? */
    isCurrent: (token) => token === current,

    /** Invalidate every outstanding request (unmount, exercise change). */
    invalidate: () => {
      current += 1;
    },
  };
}