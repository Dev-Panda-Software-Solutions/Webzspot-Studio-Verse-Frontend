import { QueryClient } from '@tanstack/react-query'

// Shared singleton so auth code (login/logout) can clear cached data when the
// signed-in account changes — query keys aren't scoped by user/tenant id, so
// without this a new account can briefly see the previous account's cached
// plan, wallet balance, events, etc. in the same browser tab.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    }
  }
})
