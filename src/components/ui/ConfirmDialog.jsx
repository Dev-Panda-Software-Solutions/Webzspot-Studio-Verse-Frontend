import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
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
                 className="relative w-full max-w-sm rounded-2xl shadow-modal z-10 m-auto max-h-[calc(100dvh-2rem)] overflow-hidden"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 20 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                 <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-4 sm:p-6 popup-scrollbar">
                   <div className="sticky top-0 z-20 -mx-4 -mt-4 mb-4 flex items-start gap-3 border-b px-4 pb-3 pt-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6"
                     style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${state.danger ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
                       <AlertTriangle size={18} style={{ color: state.danger ? '#F87171' : '#FBBF24' }} />
                     </div>
                     <div className="min-w-0 flex-1 pt-0.5">
                       <h2 className="break-words text-base font-semibold text-[var(--text-primary)]">{state.title}</h2>
                     </div>
                     <button type="button" aria-label="Close dialog" onClick={() => close(false)}
                       className="flex-shrink-0 rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]">
                       <X size={16} />
                     </button>
                   </div>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                    {state.message}
                  </p>
                   <div className="modal-actions flex flex-col-reverse gap-3 sm:flex-row">
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
