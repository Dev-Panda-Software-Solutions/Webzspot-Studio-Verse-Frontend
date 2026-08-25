import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import GoldButton from './GoldButton'

/* ── Promise-based confirmation dialog ──────────────────────────────
   Replaces native window.confirm() everywhere. Usage:
     const ok = await confirmDialog({ title, message, confirmLabel, danger })
     if (!ok) return                                        */

let openRequest = null

export function confirmDialog({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
  return new Promise(resolve => {
    openRequest?.({ title, message, confirmLabel, cancelLabel, danger, resolve })
  })
}

export default function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)

  useEffect(() => {
    openRequest = (payload) => setState(payload)
    return () => { openRequest = null }
  }, [])

  const close = useCallback((result) => {
    setState(null)
    state?.resolve?.(result)
  }, [state])

  return (
    <>
      {children}
      {createPortal(
        <AnimatePresence>
          {state && (
            <motion.div
              className="fixed inset-0 z-[9995] flex justify-center p-4 overflow-y-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="absolute inset-0 bg-black/70" onClick={() => close(false)} />
              <motion.div
                className="relative w-full max-w-sm rounded-2xl p-6 shadow-modal z-10 m-auto max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 20 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${state.danger ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
                    <AlertTriangle size={18} style={{ color: state.danger ? '#F87171' : '#FBBF24' }} />
                  </div>
                  <div className="pt-0.5">
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">{state.title}</h2>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                  {state.message}
                </p>
                <div className="flex gap-3">
                  <GoldButton
                    type="button"
                    variant="ghost"
                    className="flex-1 justify-center"
                    onClick={() => close(false)}
                  >
                    {state.cancelLabel}
                  </GoldButton>
                  <GoldButton
                    type="button"
                    variant={state.danger ? 'danger' : 'solid'}
                    className="flex-1 justify-center"
                    onClick={() => close(true)}
                  >
                    {state.confirmLabel}
                  </GoldButton>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}