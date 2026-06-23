import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function Drawer({ open, onClose, title, children, side = 'right', width = '400px' }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const variants = {
    right: { hidden: { x: '100%' }, visible: { x: 0 } },
    bottom: { hidden: { y: '100%' }, visible: { y: 0 } },
  }

  const pos = {
    right: `right-0 top-0 h-full`,
    bottom: `bottom-0 left-0 right-0`,
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={`absolute ${pos[side]} shadow-modal flex flex-col`}
            style={{
              width: side === 'right' ? width : '100%',
              maxHeight: side === 'bottom' ? '80vh' : '100vh',
              background: 'var(--bg-surface)',
              borderLeft: side === 'right' ? '1px solid var(--border-default)' : 'none',
              borderTop: side === 'bottom' ? '1px solid var(--border-default)' : 'none',
            }}
            variants={variants[side]}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="flex items-center justify-between p-5 border-b"
              style={{ borderColor: 'var(--border-default)' }}>
              <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
              <button onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
