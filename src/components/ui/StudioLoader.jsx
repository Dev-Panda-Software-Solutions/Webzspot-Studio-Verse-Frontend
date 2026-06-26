import React from 'react'

/* ─── Camera Aperture Spinner ─── */
function ApertureSpinner({ size = 72 }) {
  const blades = 6
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <style>{`
        @keyframes apertureOpen {
          0%   { transform: rotate(0deg) scaleX(0.4); opacity: 0.7; }
          50%  { transform: rotate(180deg) scaleX(1); opacity: 1; }
          100% { transform: rotate(360deg) scaleX(0.4); opacity: 0.7; }
        }
        @keyframes aperturePulse {
          0%, 100% { opacity: 0.6; transform: scale(0.92); }
          50%       { opacity: 1;   transform: scale(1); }
        }
        @keyframes shutterFlash {
          0%   { opacity: 0; transform: scale(0.8); }
          15%  { opacity: 1; transform: scale(1.05); }
          35%  { opacity: 1; }
          100% { opacity: 0; transform: scale(0.8); }
        }
        @keyframes filmScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes focusRing {
          0%, 100% { transform: scale(1);    opacity: 0.4; box-shadow: 0 0 0 2px #D4AF37; }
          50%      { transform: scale(1.12); opacity: 0.9; box-shadow: 0 0 0 3px #FFD700, 0 0 18px rgba(212,175,55,0.45); }
        }
        @keyframes captureFlash {
          0%   { opacity: 0; }
          10%  { opacity: 0.35; }
          30%  { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes floatUp {
          0%   { opacity: 0; transform: translateY(8px) scale(0.9); }
          20%  { opacity: 1; transform: translateY(0) scale(1); }
          80%  { opacity: 1; transform: translateY(-4px) scale(1); }
          100% { opacity: 0; transform: translateY(-12px) scale(0.95); }
        }
      `}</style>

      {/* Aperture blades */}
      {[...Array(blades)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: '42%',
          height: '42%',
          top: '29%',
          left: '29%',
          background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
          borderRadius: '50% 0 50% 0',
          transformOrigin: '50% 50%',
          animation: `apertureOpen ${1.6 + i * 0.08}s ease-in-out infinite`,
          animationDelay: `${i * (1.6 / blades)}s`,
          transform: `rotate(${i * (360 / blades)}deg) scaleX(0.4)`,
          opacity: 0.7,
        }} />
      ))}

      {/* Center dot */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: size * 0.18, height: size * 0.18,
        marginTop: -(size * 0.09), marginLeft: -(size * 0.09),
        borderRadius: '50%',
        background: '#FFD700',
        animation: 'aperturePulse 1.6s ease-in-out infinite',
        boxShadow: '0 0 12px rgba(255,215,0,0.6)',
      }} />

      {/* Outer ring */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        animation: 'focusRing 1.6s ease-in-out infinite',
        border: '2px solid #D4AF37',
      }} />
    </div>
  )
}

/* ─── Film Strip Loader ─── */
function FilmStrip() {
  const frames = 10
  return (
    <div style={{ width: 200, height: 40, overflow: 'hidden', borderRadius: 4, position: 'relative' }}>
      <div style={{
        display: 'flex',
        width: `${frames * 2 * 44}px`,
        animation: 'filmScroll 1.8s linear infinite',
      }}>
        {[...Array(frames * 2)].map((_, i) => (
          <div key={i} style={{
            width: 40, height: 40, flexShrink: 0, marginRight: 4,
            borderRadius: 3,
            background: i % 3 === 0
              ? 'rgba(212,175,55,0.25)'
              : i % 3 === 1
                ? 'rgba(212,175,55,0.12)'
                : 'rgba(212,175,55,0.18)',
            border: '1px solid rgba(212,175,55,0.3)',
            position: 'relative',
          }}>
            {/* Sprocket holes */}
            <div style={{
              position: 'absolute', top: 3, left: 3, width: 5, height: 5,
              borderRadius: 1, background: 'rgba(212,175,55,0.5)',
            }} />
            <div style={{
              position: 'absolute', bottom: 3, right: 3, width: 5, height: 5,
              borderRadius: 1, background: 'rgba(212,175,55,0.5)',
            }} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Capture Flash ─── */
function CaptureFlash({ visible }) {
  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'white',
      pointerEvents: 'none',
      animation: 'captureFlash 0.6s ease-out forwards',
    }} />
  )
}

/* ─── Public variants ─── */

// Full-page loading overlay with aperture animation
export function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ background: 'var(--bg-base)' }}>
      <ApertureSpinner size={80} />
      <p className="font-display text-sm tracking-widest uppercase"
        style={{ color: 'var(--text-tertiary)', letterSpacing: '0.2em' }}>
        {label}
      </p>
    </div>
  )
}

// Small inline spinner — drop-in for SkeletonLoader type="page"
export function GalleryLoader({ label = 'Opening gallery...' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8"
      style={{ background: 'var(--bg-base)' }}>
      <ApertureSpinner size={96} />
      <div className="flex flex-col items-center gap-3">
        <FilmStrip />
        <p className="font-display text-xs tracking-[0.25em] uppercase"
          style={{ color: 'var(--text-tertiary)' }}>
          {label}
        </p>
      </div>
    </div>
  )
}

// Upload in-progress animation — used while files upload
export function UploadLoader({ label = 'Uploading...', percent }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* Camera with floating photos */}
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <ApertureSpinner size={80} />
        {/* Floating photo cards */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute',
            width: 20, height: 16,
            borderRadius: 3,
            background: 'rgba(212,175,55,0.2)',
            border: '1px solid rgba(212,175,55,0.5)',
            top: '10%',
            left: `${20 + i * 20}%`,
            animation: `floatUp 1.8s ease-in-out infinite`,
            animationDelay: `${i * 0.6}s`,
          }} />
        ))}
      </div>
      {percent != null && (
        <div className="w-40 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #B8860B, #FFD700)' }} />
        </div>
      )}
      <p className="text-xs font-medium tracking-widest uppercase"
        style={{ color: 'var(--text-tertiary)', letterSpacing: '0.2em' }}>
        {label}
      </p>
    </div>
  )
}

// Tiny spinner — for buttons and inline use
export function MiniLoader({ size = 20 }) {
  return <ApertureSpinner size={size} />
}

export { CaptureFlash }
export default ApertureSpinner
