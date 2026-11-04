import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl', '2xl': 'max-w-4xl' }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-center p-4 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/70" onClick={onClose} />
          <motion.div
            className={`relative w-full ${widths[size]} rounded-2xl shadow-modal z-10 m-auto max-h-[calc(100dvh-2rem)] overflow-hidden`}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-4 sm:p-6 popup-scrollbar">
              <div className="sticky top-0 z-20 -mx-4 -mt-4 mb-6 flex items-start justify-between gap-3 border-b px-4 pb-3 pt-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <h2 className="min-w-0 break-words text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
                <button
                  onClick={onClose}
                  type="button"
                  aria-label="Close dialog"
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)]
                    hover:bg-[var(--bg-elevated)] transition-colors flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
