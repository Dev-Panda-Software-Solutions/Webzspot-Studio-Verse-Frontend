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

  // Shared in-flight lock per media_id — see galleryStore.js for why this needs
  // to be shared between the heart button (click) and the Lightbox (spacebar).
  pendingIds: new Set(),
  isPending: (mediaId) => get().pendingIds.has(mediaId),
  setPending: (mediaId, pending) => set(s => {
    const next = new Set(s.pendingIds)
    if (pending) next.add(mediaId); else next.delete(mediaId)
    return { pendingIds: next }
  }),

  reset: () => set({ favourites: {}, pendingIds: new Set() }),
}))

export default useTenantFavouriteStore
