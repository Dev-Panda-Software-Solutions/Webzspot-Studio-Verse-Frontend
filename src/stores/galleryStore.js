import { create } from 'zustand'

const useGalleryStore = create((set, get) => ({
  // media tokens: { [mediaId]: { token, issuedAt } }
  tokens: {},

  // User favourites: { [media_id]: user_favourite_media_id }
  favourites: {},

  // Derived Set kept in sync — backward compat for components using .has() / .size
  favouriteIds: new Set(),

  setToken: (mediaId, token) => set(s => ({
    tokens: { ...s.tokens, [mediaId]: { token, issuedAt: Date.now() } }
  })),

  getToken: (mediaId) => {
    const entry = get().tokens[mediaId]
    if (!entry) return null
    if (Date.now() - entry.issuedAt > 4 * 60 * 1000) return null
    return entry.token
  },

  // list = [{ media_id, user_favourite_media_id, ... }]
  setFavourites: (list) => {
    const map = {}
    ;(list || []).forEach(f => {
      if (f.media_id) map[f.media_id] = f.user_favourite_media_id
    })
    set({ favourites: map, favouriteIds: new Set(Object.keys(map)) })
  },

  // Add / replace entry (mediaId → favId). favId may be a temp string initially.
  addFavourite: (mediaId, favId) => set(s => {
    const favourites = { ...s.favourites, [mediaId]: favId }
    return { favourites, favouriteIds: new Set(Object.keys(favourites)) }
  }),

  removeFavourite: (mediaId) => set(s => {
    const favourites = { ...s.favourites }
    delete favourites[mediaId]
    return { favourites, favouriteIds: new Set(Object.keys(favourites)) }
  }),

  isFavourited: (mediaId) => mediaId in get().favourites,
  getFavId: (mediaId) => get().favourites[mediaId],
  getFavouritedMediaIds: () => new Set(Object.keys(get().favourites)),

  reset: () => set({ tokens: {}, favourites: {}, favouriteIds: new Set() }),
}))

export default useGalleryStore
