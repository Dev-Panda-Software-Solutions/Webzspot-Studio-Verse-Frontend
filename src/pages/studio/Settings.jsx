import React, { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UploadCloud, Save, User, Building2, Phone, Mail, MapPin } from 'lucide-react'
import { gsap } from 'gsap'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/layout/PageHeader'
import GlassCard from '../../components/ui/GlassCard'
import GoldButton from '../../components/ui/GoldButton'
import GoldInput from '../../components/ui/GoldInput'
import { getTenantSettings, updateTenant, getTenantById } from '../../api/tenants'
import { uploadWatermark } from '../../api/media'
import useAuthStore from '../../stores/authStore'
import { backendAssetUrl } from '../../utils/apiUrl'
import toast from 'react-hot-toast'

export default function StudioSettings() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const inputRef = useRef(null)
  const pageRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
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

  const settings = settingsData?.data
  const profile = profileData?.data

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

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

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

      <div ref={pageRef} className="max-w-2xl space-y-6">

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
      </div>
    </AppLayout>
  )
}
