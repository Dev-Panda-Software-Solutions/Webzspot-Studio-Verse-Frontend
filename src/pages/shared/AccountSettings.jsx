import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import GlassCard from '../../components/ui/GlassCard'
import GoldButton from '../../components/ui/GoldButton'
import GoldInput from '../../components/ui/GoldInput'
import PasswordStrength from '../../components/ui/PasswordStrength'
import ThemeToggle from '../../components/ui/ThemeToggle'
import useAuthStore from '../../stores/authStore'
import useThemeStore from '../../stores/themeStore'
import { changePassword } from '../../api/auth'
import toast from 'react-hot-toast'

const TABS = ['Password', 'Appearance']

export default function AccountSettings() {
  const navigate = useNavigate()
  const { user, role, logout } = useAuthStore()
  const { theme } = useThemeStore()
  const [tab, setTab] = useState('Password')
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [changingPw, setChangingPw] = useState(false)

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

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-xl mx-auto px-4 py-10">
        <button onClick={() => navigate(backPath)}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-gold-500 transition-colors mb-6">
          <ArrowLeft size={14} /> Back
        </button>

        <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)] mb-6">Account Settings</h1>

        <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--border-default)' }}>
          {TABS.map(t => (
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
