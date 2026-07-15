import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Wallet, CreditCard, Clock, ImagePlus, Gift } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import GlassCard from '../../components/ui/GlassCard'
import GoldButton from '../../components/ui/GoldButton'
import Badge from '../../components/ui/Badge'
import { getPlans } from '../../api/plans'
import { getMySubscription, subscribeToPlan, rechargeWallet, activateTrial } from '../../api/billing'
import toast from 'react-hot-toast'

const GOLD = '#F59E0B'

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

  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ['tenant-subscription'],
    queryFn: getMySubscription
  })

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => getPlans({ page: 1, limit: 100 })
  })

  const subscription = subData?.data?.subscription
  const wallet = subData?.data?.wallet
  const trialActivatedAt = subData?.data?.trial_activated_at
  const plans = plansData?.data?.items || []
  // A wallet is a feature add-on available regardless of the active subscription
  // plan type — it exists once the studio has recharged it at least once.
  const hasWallet = !!wallet

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
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to subscribe') }
    finally { setActingId(null) }
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
                    </p>
                    <Badge variant={subscription.status === 'ACTIVE' ? 'success' : subscription.status === 'TRIAL' ? 'gold' : 'error'}>
                      {subscription.status}
                    </Badge>
                  </div>
                  {subscription.plan?.plan_type !== 'WALLET' && (
                    <>
                      <p className="text-xs mt-3" style={{ color: 'var(--text-tertiary)' }}>
                        {subscription.photo_quota_used} / {subscription.photo_quota_total} photos used
                      </p>
                      <UsageBar used={subscription.photo_quota_used} total={subscription.photo_quota_total} />
                    </>
                  )}
                  {subscription.expires_at && (
                    <p className="text-xs mt-3 flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                      <Clock size={12} /> {daysLeft(subscription.expires_at)} day(s) remaining
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
          {!plansLoading && plans.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No plans have been published yet.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map(plan => {
              const isCurrent = subscription?.subscription_plan_id === plan.subscription_plan_id
              const isWallet = plan.plan_type === 'WALLET'
              return (
                <GlassCard key={plan.subscription_plan_id} hover={false} className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{plan.plan_name}</p>
                    <Badge variant={isWallet ? 'gold' : 'info'}>{plan.plan_type}</Badge>
                  </div>
                  <p className="text-2xl font-display font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                    ₹{Number(plan.price).toLocaleString()}
                  </p>
                  <p className="text-xs mb-4 flex-1" style={{ color: 'var(--text-secondary)' }}>
                    {isWallet
                      ? `${plan.wallet_credits} credits · unlocks AI events`
                      : `${plan.photo_quota} photos / ${plan.duration_value} ${plan.duration_unit?.toLowerCase()}`}
                  </p>
                  {isWallet ? (
                    <GoldButton
                      variant="solid"
                      loading={actingId === plan.subscription_plan_id}
                      onClick={() => handleRecharge(plan.subscription_plan_id)}
                    >
                      Recharge
                    </GoldButton>
                  ) : (
                    <GoldButton
                      variant={isCurrent ? 'ghost' : 'outline'}
                      disabled={isCurrent}
                      loading={actingId === plan.subscription_plan_id}
                      onClick={() => handleSubscribe(plan.subscription_plan_id)}
                    >
                      {isCurrent ? 'Current Plan' : 'Subscribe'}
                    </GoldButton>
                  )}
                </GlassCard>
              )
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
