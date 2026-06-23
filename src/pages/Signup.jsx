import React, { useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { Camera } from 'lucide-react'
import GoldButton from '../components/ui/GoldButton'
import GoldInput from '../components/ui/GoldInput'
import { signup } from '../api/auth'
import toast from 'react-hot-toast'

export default function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    tenant_studio_name: '', tenant_name: '', tenant_email_id: '', tenant_phone_number: '',
    tenant_studio_address: '', username: '', password: '', confirm_password: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const containerRef = useRef(null)
  const formRef = useRef(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.auth-field', { y: 15, opacity: 0, stagger: 0.08, duration: 0.5, ease: 'power3.out', delay: 0.2 })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  const update = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.tenant_studio_name.trim()) e.tenant_studio_name = 'Studio name is required'
    if (!form.tenant_name.trim()) e.tenant_name = 'Owner name is required'
    if (!form.username.trim()) e.username = 'Username is required'
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters'
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) {
      gsap.to(formRef.current, { x: [-6, 6, -4, 4, 0], duration: 0.4, ease: 'power2.inOut' })
      return
    }
    setLoading(true)
    try {
      const { confirm_password, ...payload } = form
      await signup(payload)
      toast.success('Studio created! Please sign in.')
      navigate('/login')
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={containerRef}
      className="min-h-screen flex items-center justify-center py-10 px-4"
      style={{ background: 'var(--bg-base)' }}>

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(245,158,11,0.06) 0%, transparent 60%)' }} />

      <div ref={formRef} className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gold-500 flex items-center justify-center mb-3 shadow-gold">
            <Camera size={22} className="text-obsidian-base" />
          </div>
          <span className="font-display font-semibold text-gold-500 text-xl">Studio-Verse</span>
        </div>

        <div className="glass rounded-2xl p-8 shadow-elevated">
          <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)] mb-1">Create your studio</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-8">Start delivering beautiful photo experiences</p>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <GoldInput label="Studio Name *" name="tenant_studio_name" value={form.tenant_studio_name}
                onChange={(e) => update('tenant_studio_name', e.target.value)} error={errors.tenant_studio_name} />
            </div>
            <div className="auth-field">
              <GoldInput label="Owner Name *" name="tenant_name" value={form.tenant_name}
                onChange={(e) => update('tenant_name', e.target.value)} error={errors.tenant_name} />
            </div>
            <div className="auth-field">
              <GoldInput label="Email" name="tenant_email_id" type="email" value={form.tenant_email_id}
                onChange={(e) => update('tenant_email_id', e.target.value)} />
            </div>
            <div className="auth-field">
              <GoldInput label="Phone" name="tenant_phone_number" value={form.tenant_phone_number}
                onChange={(e) => update('tenant_phone_number', e.target.value)} />
            </div>
            <div className="auth-field">
              <GoldInput label="Studio Address" name="tenant_studio_address" value={form.tenant_studio_address}
                onChange={(e) => update('tenant_studio_address', e.target.value)} />
            </div>
            <div className="auth-field">
              <GoldInput label="Username *" name="username" value={form.username}
                onChange={(e) => update('username', e.target.value)} error={errors.username} />
            </div>
            <div className="auth-field">
              <GoldInput label="Password *" name="password" type="password" value={form.password}
                onChange={(e) => update('password', e.target.value)} error={errors.password} />
            </div>
            <div className="auth-field">
              <GoldInput label="Confirm Password *" name="confirm_password" type="password"
                value={form.confirm_password}
                onChange={(e) => update('confirm_password', e.target.value)} error={errors.confirm_password} />
            </div>

            <GoldButton type="submit" loading={loading} size="lg" className="w-full justify-center mt-2">
              Create Studio
            </GoldButton>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')}
              className="text-gold-500 hover:text-gold-400 transition-colors font-medium">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
