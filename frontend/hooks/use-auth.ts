'use client'

import { useAuth as useClerkAuth } from '@clerk/nextjs'

/**
 * Unified auth hook for Rolodex.
 *
 * Returns a `getToken` function that retrieves the Clerk session JWT.
 * All API calls should use: const token = await getToken()
 *
 * Also returns `isSignedIn` and `isLoaded` for conditional rendering.
 */
export function useRolodexAuth() {
  const { getToken, isSignedIn, isLoaded, userId } = useClerkAuth()

  return {
    /** Get a fresh Clerk JWT for API calls */
    getToken: async () => {
      const token = await getToken()
      return token || ''
    },
    isSignedIn: !!isSignedIn,
    isLoaded: !!isLoaded,
    userId: userId || null,
  }
}
