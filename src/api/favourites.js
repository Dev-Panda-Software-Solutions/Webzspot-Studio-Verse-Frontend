import api from './axios'

export const addFavourite = (data) => api.post('/favourites', data)
export const removeFavourite = (id) => api.delete(`/favourites/${id}`)
export const getUserFavourites = (userId, eventId) =>
  api.get(`/favourites/user/${userId}/event/${eventId}`)

export const addTenantFavourite = (data) => api.post('/tenant-favourites', data)
export const removeTenantFavourite = (id) => api.delete(`/tenant-favourites/${id}`)
export const getTenantFavouritesForEvent = (eventId) =>
  api.get(`/tenant-favourites/event/${eventId}`)
export const getTenantFavouriteIdsForEventAsUser = (eventId) =>
  api.get(`/tenant-favourites/event/${eventId}/ids-for-client`)
