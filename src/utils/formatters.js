export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export const getInitials = (name = '') => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export const greetingTime = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export const isExpired = (dateStr) => {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

// Same-named clients are easy to confuse in a flat list — prefix with the
// event they belong to (e.g. "Diwali Party - Priya Sharma") when known.
export const clientDisplayName = (user) => {
  const eventName = user?.event_names?.[0]
  return eventName ? `${eventName} - ${user.user_name}` : (user?.user_name || 'Unnamed client')
}

// A tenant's `subscription` (from getAllTenants/getTenantSummary) has a raw
// plan record attached — collapse it to the short label the user actually
// wants to see: "Trial", "Wallet", "Monthly", "Annual", or the plan's own name.
export const planLabel = (subscription) => {
  if (!subscription) return 'No Plan'
  if (subscription.status === 'TRIAL') return 'Trial'
  const plan = subscription.plan
  if (!plan) return subscription.status || 'No Plan'
  if (plan.plan_type === 'WALLET') return 'Wallet'
  if (plan.duration_unit === 'MONTHS' && plan.duration_value === 1) return 'Monthly'
  if (plan.duration_unit === 'YEARS') return 'Annual'
  return plan.plan_name || 'Subscription'
}

export const planStatusVariant = (status) => {
  if (status === 'ACTIVE' || status === 'TRIAL') return 'success'
  if (status === 'GRACE') return 'gold'
  if (status === 'EXPIRED' || status === 'CANCELLED') return 'error'
  return 'default'
}
