import { create } from 'zustand'

const useTenantFavouriteStore = create((set, get) => ({
  // { [mediaId]: tenant_favourite_id }
  favourites: {},

  setFavourites: (list) => {
    const map = {}
    list.forEach(f => { map[f.media_id] = f.tenant_favourite_id })
    set({ favourites: map })
  },

  add: (mediaId, favId) => set(s => ({ favourites: { ...s.favourites, [mediaId]: favId } })),

  remove: (mediaId) => set(s => {
    const next = { ...s.favourites }
    delete next[mediaId]
    return { favourites: next }
  }),

  isFavourited: (mediaId) => mediaId in get().favourites,
  getFavId: (mediaId) => get().favourites[mediaId],
  getFavouritedIds: () => new Set(Object.keys(get().favourites)),

  reset: () => set({ favourites: {} }),
}))

export default useTenantFavouriteStore
