import React, { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, Save, User, Building2, Phone, Mail, MapPin, CreditCard, Palette } from 'lucide-react'
import { gsap } from 'gsap'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/layout/PageHeader'
import GlassCard from '../../components/ui/GlassCard'
import GoldButton from '../../components/ui/GoldButton'
import GoldInput from '../../components/ui/GoldInput'
import Badge from '../../components/ui/Badge'
import { getTenantSettings, updateTenant, updateTenantSettings, getTenantById } from '../../api/tenants'
import { uploadWatermark } from '../../api/media'
import { getMySubscription } from '../../api/billing'
import useAuthStore from '../../stores/authStore'
import { backendAssetUrl } from '../../utils/apiUrl'
import toast from 'react-hot-toast'

export default function StudioSettings() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const pageRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingBrand, setSavingBrand] = useState(false)
  const [brand, setBrand] = useState({ primary_color: '', secondary_color: '' })
  const [form, setForm] = useState({
    tenant_name: '',
    tenant_studio_name: '',
    tenant_email_id: '',
    tenant_phone_number: '',
    tenant_studio_address: '',
  })

  const { data: settingsData } = useQuery({
    queryKey: ['tenant-settings', user?.tenant_id],
    queryFn: () => getTenantSettings(user?.tenant_id),
    enabled: !!user?.tenant_id
  })

  const { data: profileData } = useQuery({
    queryKey: ['tenant-profile', user?.tenant_id],
    queryFn: () => getTenantById(user?.tenant_id),
    enabled: !!user?.tenant_id
  })

  const { data: subData } = useQuery({
    queryKey: ['tenant-subscription'],
    queryFn: getMySubscription,
    enabled: !!user?.tenant_id
  })

  const settings = settingsData?.data
  const profile = profileData?.data
  const subscription = subData?.data?.subscription

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.settings-section',
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.1, duration: 0.5, ease: 'power3.out' }
      )
    }, pageRef)
    return () => ctx.revert()
  }, [])

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setForm({
        tenant_name: profile.tenant_name || '',
        tenant_studio_name: profile.tenant_studio_name || '',
        tenant_email_id: profile.tenant_email_id || '',
        tenant_phone_number: profile.tenant_phone_number || '',
        tenant_studio_address: profile.tenant_studio_address || '',
      })
    }
  }, [profile])

  // Populate brand colours when settings load
  useEffect(() => {
    if (settings) {
      setBrand({
        primary_color: settings.primary_color || '',
        secondary_color: settings.secondary_color || '',
      })
    }
  }, [settings])

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSaveBrand = async (e) => {
    e.preventDefault()
    if (!user?.tenant_id) return
    setSavingBrand(true)
    try {
      await updateTenantSettings(user.tenant_id, {
        primary_color: brand.primary_color || null,
        secondary_color: brand.secondary_color || null,
      })
      qc.invalidateQueries(['tenant-settings', user.tenant_id])
      toast.success('Brand colours saved')
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to save brand colours')
    } finally {
      setSavingBrand(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!user?.tenant_id) return
    setSaving(true)
    try {
      await updateTenant(user.tenant_id, form)
      qc.invalidateQueries(['tenant-profile', user.tenant_id])
      toast.success('Studio profile updated')
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleWatermarkUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('image', file)
    setUploading(true)
    try {
      await uploadWatermark(formData)
      toast.success('Watermark updated')
      qc.invalidateQueries(['tenant-settings'])
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <AppLayout title="Studio Profile" subtitle="Manage your studio details, watermark and preferences">

      <div ref={pageRef} className="space-y-6">

        {/* ── Studio Profile ── */}
        <GlassCard hover={false} className="settings-section">
          <h3 className="font-semibold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Building2 size={16} style={{ color: 'var(--accent-primary)' }} />
            Studio Details
          </h3>
          <form onSubmit={handleSaveProfile} className="space-y-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
              <GoldInput
                label="Your Name"
                name="tenant_name"
                value={form.tenant_name}
                onChange={handleChange}
                icon={<User size={14} />}
              />
              <GoldInput
                label="Studio Name"
                name="tenant_studio_name"
                value={form.tenant_studio_name}
                onChange={handleChange}
                icon={<Building2 size={14} />}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
              <GoldInput
                label="Email"
                name="tenant_email_id"
                type="email"
                value={form.tenant_email_id}
                onChange={handleChange}
                icon={<Mail size={14} />}
              />
              <GoldInput
                label="Phone"
                name="tenant_phone_number"
                value={form.tenant_phone_number}
                onChange={handleChange}
                icon={<Phone size={14} />}
              />
            </div>
            <GoldInput
              label="Studio Address"
              name="tenant_studio_address"
              value={form.tenant_studio_address}
              onChange={handleChange}
              icon={<MapPin size={14} />}
            />
            <div className="pt-3">
              <GoldButton type="submit" loading={saving} icon={<Save size={14} />}>
                Save Profile
              </GoldButton>
            </div>
          </form>
        </GlassCard>

        {/* ── Plan & Billing ── */}
        <GlassCard hover={false} className="settings-section">
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <CreditCard size={16} style={{ color: 'var(--accent-primary)' }} />
            Plan &amp; Billing
          </h3>
          {subscription ? (
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {subscription.plan?.plan_name || 'Free Trial'}
                </p>
                {subscription.plan?.plan_type !== 'WALLET' && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    {subscription.photo_quota_used} / {subscription.photo_quota_total} photos used
                  </p>
                )}
              </div>
              <Badge variant={subscription.status === 'ACTIVE' ? 'success' : subscription.status === 'TRIAL' ? 'gold' : 'error'}>
                {subscription.status}
              </Badge>
            </div>
          ) : (
            <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>No active subscription found.</p>
          )}
          <GoldButton variant="outline" onClick={() => navigate('/studio/billing')}>Manage Billing</GoldButton>
        </GlassCard>

        {/* ── Watermark ── */}
        <GlassCard hover={false} className="settings-section">
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <UploadCloud size={16} style={{ color: 'var(--accent-primary)' }} />
            Gallery Watermark
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Your watermark appears as a translucent overlay on all photos in your client galleries.
            It is never burned into the actual image files.
          </p>

          {settings?.tenant_watermark_path && (
            <div className="mb-5 p-4 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
              <p className="text-xs mb-2 uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)' }}>
                Current Watermark
              </p>
              <img
                src={backendAssetUrl(settings.tenant_watermark_path)}
                alt="Watermark preview"
                className="max-h-16 max-w-32 object-contain opacity-60"
              />
            </div>
          )}

          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleWatermarkUpload} />
          <GoldButton
            onClick={() => inputRef.current?.click()}
            loading={uploading}
            icon={<UploadCloud size={14} />}
            variant="outline"
          >
            {settings?.tenant_watermark_path ? 'Replace Watermark' : 'Upload Watermark'}
          </GoldButton>
        </GlassCard>

        {/* ── Brand Colours ── */}
        <GlassCard hover={false} className="settings-section">
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Palette size={16} style={{ color: 'var(--accent-primary)' }} />
            Brand Colours
          </h3>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            These colours replace the gold theme in your client galleries — event headers, buttons,
            hearts and badges all follow your brand.
          </p>

          <form onSubmit={handleSaveBrand}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Primary Colour
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brand.primary_color || '#F59E0B'}
                    onChange={e => setBrand(b => ({ ...b, primary_color: e.target.value }))}
                    className="w-11 h-11 rounded-xl cursor-pointer"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                  />
                  <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                    {brand.primary_color || 'Not set — default gold'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Secondary Colour
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brand.secondary_color || '#D97706'}
                    onChange={e => setBrand(b => ({ ...b, secondary_color: e.target.value }))}
                    className="w-11 h-11 rounded-xl cursor-pointer"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                  />
                  <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                    {brand.secondary_color || 'Not set — default amber'}
                  </span>
                </div>
              </div>
            </div>
            <GoldButton type="submit" loading={savingBrand} icon={<Save size={14} />}>
              Save Colours
            </GoldButton>
          </form>
        </GlassCard>
      </div>
    </AppLayout>
  )
}
