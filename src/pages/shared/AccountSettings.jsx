import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, KeyRound } from 'lucide-react'
import GlassCard from '../../components/ui/GlassCard'
import GoldButton from '../../components/ui/GoldButton'
import GoldInput from '../../components/ui/GoldInput'
import PasswordStrength from '../../components/ui/PasswordStrength'
import ThemeToggle from '../../components/ui/ThemeToggle'
import useAuthStore from '../../stores/authStore'
import useThemeStore from '../../stores/themeStore'
import { changePassword } from '../../api/auth'
import { unlockAccount, resetPassword } from '../../api/tenants'
import toast from 'react-hot-toast'

export default function AccountSettings() {
  const navigate = useNavigate()
  const { user, role, logout } = useAuthStore()
  const { theme } = useThemeStore()
  const tabs = role === 'SUPER_ADMIN' ? ['Password', 'Accounts', 'Appearance'] : ['Password', 'Appearance']
  const [tab, setTab] = useState('Password')
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [changingPw, setChangingPw] = useState(false)
  const [unlockUsername, setUnlockUsername] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [resetForm, setResetForm] = useState({ username: '', new_password: '' })
  const [resetting, setResetting] = useState(false)

  const backPath = role === 'SUPER_ADMIN' ? '/admin' : role === 'ADMIN' ? '/studio' : '/gallery'

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirm) { toast.error('Passwords do not match'); return }
    if (pwForm.new_password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setChangingPw(true)
    try {
      await changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password })
      toast.success('Password changed. Please log in again.')
      logout()
      navigate('/login')
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to change password')
    } finally { setChangingPw(false) }
  }

  const handleUnlock = async (e) => {
    e.preventDefault()
    if (!unlockUsername.trim()) return
    setUnlocking(true)
    try {
      await unlockAccount({ username: unlockUsername })
      toast.success(`Account "${unlockUsername}" unlocked`)
      setUnlockUsername('')
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to unlock account') }
    finally { setUnlocking(false) }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!resetForm.username || !resetForm.new_password) return
    setResetting(true)
    try {
      await resetPassword(resetForm)
      toast.success('Password reset successfully')
      setResetForm({ username: '', new_password: '' })
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to reset password') }
    finally { setResetting(false) }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-xl mx-auto px-4 py-10">
        <button onClick={() => navigate(backPath)}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-gold-500 transition-colors mb-6">
          <ArrowLeft size={14} /> Back
        </button>

        <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)] mb-6">Account Settings</h1>

        <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--border-default)' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px
                ${tab === t ? 'border-gold-500 text-gold-500' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'Password' && (
          <GlassCard hover={false}>
            <h3 className="font-semibold text-[var(--text-primary)] mb-6">Change Password</h3>
            <form onSubmit={handlePasswordChange}>
              <GoldInput label="Current Password" name="current_password" type="password"
                value={pwForm.current_password} onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} />
              <GoldInput label="New Password" name="new_password" type="password"
                value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} />
              <PasswordStrength value={pwForm.new_password} />
              <GoldInput label="Confirm New Password" name="confirm" type="password"
                value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
              <GoldButton type="submit" loading={changingPw} className="w-full justify-center mt-2">
                Update Password
              </GoldButton>
            </form>
          </GlassCard>
        )}

        {tab === 'Accounts' && (
          <div className="space-y-6">
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)' }}>
                  <Lock size={14} className="text-gold-500" />
                </div>
                <h3 className="font-semibold text-[var(--text-primary)]">Unlock Account</h3>
              </div>
              <form onSubmit={handleUnlock} className="space-y-3">
                <GoldInput
                  label="Username"
                  name="unlock_username"
                  value={unlockUsername}
                  onChange={(e) => setUnlockUsername(e.target.value)}
                />
                <GoldButton type="submit" loading={unlocking} className="w-full justify-center">
                  Unlock
                </GoldButton>
              </form>
            </GlassCard>

            <GlassCard hover={false}>
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)' }}>
                  <KeyRound size={14} className="text-gold-500" />
                </div>
                <h3 className="font-semibold text-[var(--text-primary)]">Reset Password</h3>
              </div>
              <form onSubmit={handleReset} className="space-y-3">
                <GoldInput
                  label="Username"
                  name="reset_username"
                  value={resetForm.username}
                  onChange={(e) => setResetForm(f => ({ ...f, username: e.target.value }))}
                />
                <GoldInput
                  label="New Password"
                  name="new_password"
                  type="password"
                  value={resetForm.new_password}
                  onChange={(e) => setResetForm(f => ({ ...f, new_password: e.target.value }))}
                />
                <PasswordStrength value={resetForm.new_password} />
                <GoldButton type="submit" loading={resetting} className="w-full justify-center">
                  Reset
                </GoldButton>
              </form>
            </GlassCard>
          </div>
        )}

        {tab === 'Appearance' && (
          <GlassCard hover={false}>
            <h3 className="font-semibold text-[var(--text-primary)] mb-6">Appearance</h3>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Theme</p>
                <p className="text-xs text-[var(--text-secondary)]">Currently: {theme === 'dark' ? 'Dark (Obsidian)' : 'Light (Ivory)'}</p>
              </div>
              <ThemeToggle size="lg" />
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  )
}
