import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      role: null,
      login: (token, user) => {
        // Query keys (e.g. ['tenant-subscription'], ['plans'], ['user-events']) aren't
        // scoped by user/tenant id, so without clearing this a freshly logged-in account
        // can briefly render the previous account's cached plan/wallet/events in this tab.
        try { require('../lib/queryClient').queryClient.clear() } catch {}
        set({ token, user, role: user.role })
      },
      logout: () => {
        // Clear all session-scoped stores so no data leaks to the next user on the same tab
        set({ token: null, user: null, role: null })
        try { require('../lib/queryClient').queryClient.clear() } catch {}
        try {
          // Dynamically reset gallery and tenant-favourite caches
          const { default: useGalleryStore } = require('./galleryStore')
          const { default: useTenantFavouriteStore } = require('./tenantFavouriteStore')
          useGalleryStore.getState().reset()
          useTenantFavouriteStore.getState().reset()
        } catch {}
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: 'sv-auth',
      // sessionStorage clears on tab/browser close — safer than localStorage on shared machines
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)

export default useAuthStore
