import React, { useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { Camera } from 'lucide-react'
import GoldButton from '../components/ui/GoldButton'
import GoldInput from '../components/ui/GoldInput'
import { login } from '../api/auth'
import useAuthStore from '../stores/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { login: storeLogin } = useAuthStore()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const formRef = useRef(null)
  const containerRef = useRef(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('.auth-logo', { y: -20, opacity: 0, duration: 0.5 })
        .from('.auth-title', { y: 15, opacity: 0, duration: 0.5 }, '-=0.2')
        .from('.auth-field', { y: 15, opacity: 0, stagger: 0.1, duration: 0.5 }, '-=0.2')
        .from('.auth-btn', { y: 10, opacity: 0, duration: 0.4 }, '-=0.1')
    }, containerRef)
    return () => ctx.revert()
  }, [])

  const shakeForm = () => {
    gsap.to(formRef.current, {
      x: [-8, 8, -6, 6, -3, 3, 0],
      duration: 0.5,
      ease: 'power2.inOut'
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) {
      setError('Please enter your username and password')
      shakeForm()
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await login(form)
      const token = res.data?.token
      const userObj = res.data?.user
      if (!token || !userObj) throw new Error('No token')
      storeLogin(token, userObj)
      toast.success('Welcome back!')
      if (userObj.role === 'SUPER_ADMIN') navigate('/admin')
      else if (userObj.role === 'ADMIN') navigate('/studio')
      else navigate('/gallery')
    } catch (err) {
      const msg = typeof err === 'string' ? err : 'Invalid credentials. Please try again.'
      setError(msg)
      shakeForm()
    } finally {
      setLoading(false)
    }
  }

  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError('') }

  return (
    <div ref={containerRef}
      className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
      style={{ background: 'var(--bg-base)' }}>

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(245,158,11,0.07) 0%, transparent 65%)' }} />

      {/* Card */}
      <div ref={formRef} className="w-full max-w-sm">
        {/* Logo */}
        <div className="auth-logo flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gold-500 flex items-center justify-center mb-3 shadow-gold">
            <Camera size={22} className="text-obsidian-base" />
          </div>
          <span className="font-display font-semibold text-gold-500 text-xl">Studio-Verse</span>
        </div>

        <div className="glass rounded-2xl p-8 shadow-elevated">
          <h1 className="auth-title font-display text-2xl font-semibold text-[var(--text-primary)] mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mb-8">Sign in to your account</p>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <GoldInput
                label="Username"
                name="username"
                value={form.username}
                onChange={(e) => update('username', e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="auth-field">
              <GoldInput
                label="Password"
                name="password"
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 mb-4 text-center">{error}</p>
            )}

            <div className="auth-btn">
              <GoldButton type="submit" loading={loading} size="lg" className="w-full justify-center">
                Sign In
              </GoldButton>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            Studio?{' '}
            <button onClick={() => navigate('/signup')}
              className="text-gold-500 hover:text-gold-400 transition-colors font-medium">
              Create your account
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
