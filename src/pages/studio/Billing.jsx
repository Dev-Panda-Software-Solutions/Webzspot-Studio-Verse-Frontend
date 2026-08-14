import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Wallet, CreditCard, Clock, ImagePlus, Gift, History, AlertTriangle, TrendingDown, ArrowUpRight } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import GlassCard from '../../components/ui/GlassCard'
import GoldButton from '../../components/ui/GoldButton'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import { getPlans } from '../../api/plans'
import { getMySubscription, getMySubscriptionHistory, subscribeToPlan, upgradePlan, downgradePlan, rechargeWallet, activateTrial } from '../../api/billing'
import { formatDate, planLabel, planStatusVariant } from '../../utils/formatters'
import toast from 'react-hot-toast'

const GOLD = '#F59E0B'

// Label for the "Change" column in plan history — what created each row.
const changeLabel = (changeType) => {
  switch (changeType) {
    case 'UPGRADE': return { label: 'Upgrade', variant: 'success' }
    case 'DOWNGRADE': return { label: 'Downgrade', variant: 'gold' }
    case 'SUBSCRIBE': return { label: 'Subscribe', variant: 'info' }
    case 'TRIAL': return { label: 'Trial', variant: 'info' }
    case 'FREE_GRANT': return { label: 'Free Grant', variant: 'gold' }
    case 'REVOKE': return { label: 'Revoked', variant: 'error' }
    default: return null
  }
}

function UsageBar({ used, total }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0
  return (
    <div className="h-1.5 rounded-full overflow-hidden mt-2" style={{ background: 'var(--bg-elevated)' }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: GOLD }} />
    </div>
  )
}

const daysLeft = (expiresAt) => {
  if (!expiresAt) return null
  const diff = new Date(expiresAt) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function Billing() {
  const qc = useQueryClient()
  const [actingId, setActingId] = useState(null)
  const [activatingTrial, setActivatingTrial] = useState(false)
  const [downgradeTarget, setDowngradeTarget] = useState(null)

  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ['tenant-subscription'],
    queryFn: getMySubscription
  })

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => getPlans({ page: 1, limit: 100 })
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['tenant-subscription-history'],
    queryFn: getMySubscriptionHistory
  })
  const history = historyData?.data || []

  const subscription = subData?.data?.subscription
  const wallet = subData?.data?.wallet
  const trialActivatedAt = subData?.data?.trial_activated_at
  const plans = plansData?.data?.items || []
  // A wallet is a feature add-on available regardless of the active subscription
  // plan type — it exists once the studio has recharged it at least once.
  const hasWallet = !!wallet
  const subscriptionPlans = plans.filter(p => p.plan_type === 'SUBSCRIPTION')
  // Before the one-time initial purchase, only INITIAL plans are offered;
  // afterwards only TOPUP amounts are (the initial purchase can't be repeated).
  const walletPlansToShow = plans.filter(p =>
    p.plan_type === 'WALLET' && p.wallet_tier === (hasWallet ? 'TOPUP' : 'INITIAL')
  )

  const handleActivateTrial = async () => {
    setActivatingTrial(true)
    try {
      await activateTrial()
      toast.success("Free trial activated!")
      qc.invalidateQueries(['tenant-subscription'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to activate trial') }
    finally { setActivatingTrial(false) }
  }

  const handleSubscribe = async (planId) => {
    setActingId(planId)
    try {
      await subscribeToPlan(planId)
      toast.success('Plan updated')
      qc.invalidateQueries(['tenant-subscription'])
      qc.invalidateQueries(['tenant-subscription-history'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to subscribe') }
    finally { setActingId(null) }
  }

  const handleUpgrade = async (planId, planName) => {
    setActingId(planId)
    try {
      const res = await upgradePlan(planId)
      const amount = res?.data?.amount_charged
      toast.success(amount != null ? `Upgraded to ${planName} — ₹${amount} charged` : `Upgraded to ${planName}`)
      qc.invalidateQueries(['tenant-subscription'])
      qc.invalidateQueries(['tenant-subscription-history'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to upgrade') }
    finally { setActingId(null) }
  }

  // Opens the no-refund warning modal; the downgrade only fires after confirm.
  const handleDowngrade = async (planId, planName) => {
    setActingId(planId)
    try {
      await downgradePlan(planId)
      toast.success(`Downgraded to ${planName} — no refund issued`)
      qc.invalidateQueries(['tenant-subscription'])
      qc.invalidateQueries(['tenant-subscription-history'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to downgrade') }
    finally { setActingId(null); setDowngradeTarget(null) }
  }

  const handleRecharge = async (planId) => {
    setActingId(planId)
    try {
      await rechargeWallet(planId)
      toast.success('Wallet recharged')
      qc.invalidateQueries(['tenant-subscription'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to recharge') }
    finally { setActingId(null) }
  }

  return (
    <AppLayout title="Billing" subtitle="Manage your plan, photo quota, and wallet credits">
      <div className="space-y-6 max-w-4xl">

        {subscription?.status === 'GRACE' && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)' }}>
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Your billing period ended — you're in the grace period
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Uploads are disabled, but your existing events and photos are still visible to clients.
                {subscription.grace_ends_at && (
                  <> Renew within <strong>{daysLeft(subscription.grace_ends_at)} day{daysLeft(subscription.grace_ends_at) === 1 ? '' : 's'}</strong> or all events, photos, and shared links will be permanently deleted.</>
                )}
              </p>
            </div>
          </div>
        )}

        {!subscription && !subLoading && history[0]?.status === 'EXPIRED' && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)' }}>
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" style={{ color: '#F87171' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Your last subscription expired</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Its grace period lapsed without renewal, so its events, photos, and shared links were permanently deleted. Subscribe to a plan below to start fresh.
              </p>
            </div>
          </div>
        )}

        {!subLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <GlassCard hover={false}>
              <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <ImagePlus size={16} style={{ color: 'var(--accent-primary)' }} />
                Current Plan
              </h3>
              {subscription ? (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {subscription.plan?.plan_name || 'Free Trial'}
                      {subscription.is_free_grant && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-gold-500">
                          Free Access
                        </span>
                      )}
                    </p>
                    <Badge variant={planStatusVariant(subscription.status)}>
                      {subscription.status}
                    </Badge>
                  </div>
                  {subscription.is_free_grant && (
                    <p className="text-xs mt-2" style={{ color: '#F59E0B' }}>
                      Granted free by the platform{subscription.expires_at ? ` until ${new Date(subscription.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}.
                    </p>
                  )}
                  {subscription.plan?.plan_type !== 'WALLET' && (
                    <>
                      <p className="text-xs mt-3" style={{ color: 'var(--text-tertiary)' }}>
                        {subscription.photo_quota_used} / {subscription.photo_quota_total} photos used
                      </p>
                      <UsageBar used={subscription.photo_quota_used} total={subscription.photo_quota_total} />
                    </>
                  )}
                  {subscription.status === 'GRACE' && subscription.grace_ends_at ? (
                    <p className="text-xs mt-3 flex items-center gap-1" style={{ color: '#F59E0B' }}>
                      <Clock size={12} /> {daysLeft(subscription.grace_ends_at)} day(s) left before data is deleted
                    </p>
                  ) : subscription.expires_at && (
                    <p className="text-xs mt-3 flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                      <Clock size={12} /> {daysLeft(subscription.expires_at)} day(s) until renewal is due
                    </p>
                  )}
                </>
              ) : trialActivatedAt ? (
                <>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No active subscription found.</p>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                    Your free trial has already been used. Subscribe to a plan below to continue.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    No active subscription — activate your one-time free trial or choose a plan below.
                  </p>
                  <GoldButton icon={<Gift size={13} />} loading={activatingTrial} onClick={handleActivateTrial}>
                    Activate Free Trial
                  </GoldButton>
                </>
              )}
            </GlassCard>

            {hasWallet && (
              <GlassCard hover={false}>
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Wallet size={16} style={{ color: 'var(--accent-primary)' }} />
                  Wallet Balance
                </h3>
                <p className="text-3xl font-display font-semibold" style={{ color: GOLD }}>
                  {wallet?.balance_credits ?? 0}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>credits available for AI events</p>
              </GlassCard>
            )}
          </div>
        )}

        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <CreditCard size={16} style={{ color: 'var(--accent-primary)' }} />
            Available Plans
          </h3>
          {!plansLoading && subscriptionPlans.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No plans have been published yet.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptionPlans.map(plan => {
              const isCurrent = subscription?.subscription_plan_id === plan.subscription_plan_id
              const currentPrice = subscription
                ? (subscription.locked_price != null ? Number(subscription.locked_price) : Number(subscription.plan?.price || 0))
                : 0
              const planSwapEligible = !isCurrent && subscription
                && ['ACTIVE', 'TRIAL'].includes(subscription.status)
                && subscription.plan?.plan_type === 'SUBSCRIPTION'
                && subscription.plan?.duration_unit === plan.duration_unit
              // Upgrading (same billing interval, higher price) keeps the quota
              // already used and the billing period — only charges the price
              // difference. Anything else (no active sub, GRACE, EXPIRED,
              // different interval) goes through subscribe instead.
              const canUpgrade = planSwapEligible && Number(plan.price) > currentPrice
              const canDowngrade = planSwapEligible && Number(plan.price) < currentPrice
              const upgradeAmount = canUpgrade ? Number(plan.price) - currentPrice : null
              const isRenewal = ['GRACE', 'EXPIRED'].includes(subscription?.status)

              return (
                <GlassCard key={plan.subscription_plan_id} hover={false} className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{plan.plan_name}</p>
                    <Badge variant="info">{plan.plan_type}</Badge>
                  </div>
                  <p className="text-2xl font-display font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                    ₹{Number(plan.price).toLocaleString()}
                  </p>
                  <p className="text-xs mb-4 flex-1" style={{ color: 'var(--text-secondary)' }}>
                    {plan.photo_quota} photos / {plan.duration_value} {plan.duration_unit?.toLowerCase()}
                  </p>
                  <GoldButton
                    variant={isCurrent ? 'ghost' : 'outline'}
                    disabled={isCurrent}
                    loading={actingId === plan.subscription_plan_id}
                    onClick={() => {
                      if (canUpgrade) handleUpgrade(plan.subscription_plan_id, plan.plan_name)
                      else if (canDowngrade) setDowngradeTarget({ planId: plan.subscription_plan_id, planName: plan.plan_name, price: Number(plan.price) })
                      else handleSubscribe(plan.subscription_plan_id)
                    }}
                  >
                    {isCurrent ? 'Current Plan'
                      : canUpgrade ? `Upgrade (+₹${upgradeAmount.toLocaleString()})`
                      : canDowngrade ? 'Downgrade'
                      : isRenewal ? 'Renew' : 'Subscribe'}
                  </GoldButton>
                </GlassCard>
              )
            })}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Wallet size={16} style={{ color: 'var(--accent-primary)' }} />
            {hasWallet ? 'Top Up Wallet' : 'Get Started with Wallet'}
          </h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
            {hasWallet
              ? 'Add more credits any time — credits never expire.'
              : 'Purchase the initial wallet plan once to unlock AI events and start topping up later.'}
          </p>
          {!plansLoading && walletPlansToShow.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {hasWallet ? 'No top-up amounts have been published yet.' : 'No initial wallet plan has been published yet.'}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {walletPlansToShow.map(plan => (
              <GlassCard key={plan.subscription_plan_id} hover={false} className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{plan.plan_name}</p>
                  <Badge variant={plan.wallet_tier === 'INITIAL' ? 'success' : 'gold'}>
                    {plan.wallet_tier === 'INITIAL' ? 'Initial' : 'Top-up'}
                  </Badge>
                </div>
                <p className="text-2xl font-display font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  ₹{Number(plan.price).toLocaleString()}
                </p>
                <p className="text-xs mb-4 flex-1" style={{ color: 'var(--text-secondary)' }}>
                  {plan.wallet_credits} credits · unlocks AI events
                </p>
                <GoldButton
                  variant="solid"
                  loading={actingId === plan.subscription_plan_id}
                  onClick={() => handleRecharge(plan.subscription_plan_id)}
                >
                  {plan.wallet_tier === 'INITIAL' ? 'Purchase' : 'Recharge'}
                </GoldButton>
              </GlassCard>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <History size={16} style={{ color: 'var(--accent-primary)' }} />
            Purchased Plans History
          </h3>
          <GlassCard hover={false} className="p-0 overflow-hidden">
            {historyLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(3)].map((_, i) => <SkeletonLoader key={i} type="table-row" />)}
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm p-6 text-center" style={{ color: 'var(--text-tertiary)' }}>No plans purchased yet.</p>
            ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                          {['Change', 'Plan', 'Status', 'Price', 'Started', 'Expires'].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {history.map(h => {
                          const change = changeLabel(h.change_type)
                          return (
                          <tr key={h.tenant_subscription_id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
                            <td className="px-5 py-3">
                              {change ? <Badge variant={change.variant}>{change.label}</Badge> : '—'}
                            </td>
                            <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{planLabel(h)}</td>
                            <td className="px-5 py-3"><Badge variant={planStatusVariant(h.status)}>{h.status}</Badge></td>
                            <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {h.locked_price != null ? `₹${Number(h.locked_price).toLocaleString()}` : '—'}
                            </td>
                            <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>{formatDate(h.starts_at)}</td>
                            <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>{h.expires_at ? formatDate(h.expires_at) : '—'}</td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* ── Downgrade confirmation — no refund warning ── */}
      <Modal
        open={!!downgradeTarget}
        onClose={() => setDowngradeTarget(null)}
        title="Downgrade Plan"
      >
        <div className="rounded-xl p-4 mb-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)' }}>
          <TrendingDown size={18} className="mt-0.5 flex-shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Downgrade to {downgradeTarget?.planName} (₹{downgradeTarget?.price?.toLocaleString()})?
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: '#F87171' }}>No money will be refunded.</strong> The price difference between your
              current plan and the lower plan is forfeited, and your billing period continues unchanged.
            </p>
          </div>
        </div>
        <ul className="text-xs space-y-1.5 mb-5 pl-1" style={{ color: 'var(--text-tertiary)' }}>
          <li>• Your already-used photo quota is carried over — if it exceeds the new plan's limit, uploads pause until renewal.</li>
          <li>• The downgrade takes effect immediately and will be recorded in your plan history.</li>
        </ul>
        <div className="flex gap-3">
          <GoldButton
            variant="danger"
            className="flex-1"
            loading={actingId === downgradeTarget?.planId}
            onClick={() => handleDowngrade(downgradeTarget.planId, downgradeTarget.planName)}
          >
            <ArrowUpRight className="rotate-90" size={14} />
            Confirm Downgrade — No Refund
          </GoldButton>
          <GoldButton variant="ghost" onClick={() => setDowngradeTarget(null)}>Cancel</GoldButton>
        </div>
      </Modal>
    </AppLayout>
  )
}
