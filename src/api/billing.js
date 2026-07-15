import api from './axios'

export const getMySubscription = () => api.get('/billing/my-subscription')
export const getTenantSubscription = (tenantId) => api.get(`/billing/tenant/${tenantId}`)
export const subscribeToPlan = (subscription_plan_id) => api.post('/billing/subscribe', { subscription_plan_id })
export const rechargeWallet = (subscription_plan_id) => api.post('/billing/recharge', { subscription_plan_id })
export const activateTrial = () => api.post('/billing/activate-trial')
