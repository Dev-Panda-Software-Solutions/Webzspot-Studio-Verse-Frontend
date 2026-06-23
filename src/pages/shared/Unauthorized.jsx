import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import GoldButton from '../../components/ui/GoldButton'

export default function Unauthorized() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center text-center px-6"
      style={{ background: 'var(--bg-base)' }}>
      <div>
        <ShieldOff size={48} className="mx-auto mb-4 text-[var(--text-tertiary)] animate-float" />
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Access Denied</h1>
        <p className="text-[var(--text-secondary)] mb-8">You don't have permission to view this page.</p>
        <GoldButton onClick={() => navigate(-1)} variant="outline">Go Back</GoldButton>
      </div>
    </div>
  )
}
