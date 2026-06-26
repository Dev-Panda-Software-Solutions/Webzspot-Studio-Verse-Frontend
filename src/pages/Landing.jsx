import React, { useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Camera, Shield, Zap, Download, ArrowRight, Star } from 'lucide-react'
import GoldButton from '../components/ui/GoldButton'
import GlassCard from '../components/ui/GlassCard'

gsap.registerPlugin(ScrollTrigger)

function GoldParticle({ style }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{ width: 3, height: 3, background: 'rgba(245,158,11,0.7)', ...style }}
    />
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const particlesRef = useRef([])

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Word-by-word headline
      const words = document.querySelectorAll('.hero-word')
      gsap.from(words, { y: 50, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', delay: 0.2 })

      // Subheadline
      gsap.from('.hero-sub', { y: 20, opacity: 0, duration: 0.7, delay: 0.8, ease: 'power3.out' })
      gsap.from('.hero-ctas', { y: 20, opacity: 0, duration: 0.7, delay: 1.0, ease: 'power3.out' })

      // Float particles
      particlesRef.current.forEach((p, i) => {
        if (!p) return
        gsap.to(p, {
          y: '-120vh',
          x: `+=${(Math.random() - 0.5) * 200}`,
          opacity: 0,
          duration: 6 + Math.random() * 6,
          delay: Math.random() * 4,
          repeat: -1,
          ease: 'none',
        })
      })

      // Features scroll reveal
      gsap.from('.feature-card', {
        scrollTrigger: { trigger: '.features-section', start: 'top 80%' },
        y: 50, opacity: 0, stagger: 0.15, duration: 0.7, ease: 'power3.out'
      })

      // Steps reveal
      gsap.from('.step-item', {
        scrollTrigger: { trigger: '.steps-section', start: 'top 80%' },
        y: 40, opacity: 0, stagger: 0.2, duration: 0.7, ease: 'power3.out'
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  const particles = [...Array(40)].map((_, i) => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    opacity: Math.random() * 0.8 + 0.2,
  }))

  const headline = 'Where Your Work Becomes an Experience'.split(' ')

  return (
    <div ref={containerRef} style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ background: 'rgba(10,10,11,0.92)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gold-500 flex items-center justify-center">
            <Camera size={14} className="text-obsidian-base" />
          </div>
          <span className="font-display font-semibold text-gold-500">Webzspot Studio</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/login')}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-4 py-2">
            Sign In
          </button>
          <GoldButton onClick={() => navigate('/signup')} size="sm">Get Started</GoldButton>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden pt-20">
        {/* Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p, i) => (
            <div key={i} ref={el => particlesRef.current[i] = el}
              className="absolute rounded-full"
              style={{ width: 2 + Math.random() * 2, height: 2 + Math.random() * 2,
                left: p.left, top: p.top, background: `rgba(245,158,11,${p.opacity * 0.6})` }}
            />
          ))}
        </div>

        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(245,158,11,0.08) 0%, transparent 70%)' }} />

        <p className="text-xs font-semibold uppercase tracking-widest text-gold-500 mb-6 border border-gold-500/30
          px-4 py-1.5 rounded-full bg-[var(--accent-muted)]">
          Professional Photo Delivery Platform
        </p>

        <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6 max-w-4xl overflow-hidden">
          {headline.map((word, i) => (
            <span key={i} className="hero-word inline-block mr-[0.3em] text-[var(--text-primary)]">
              {word}
            </span>
          ))}
        </h1>

        <p className="hero-sub text-lg md:text-xl text-[var(--text-secondary)] max-w-xl mb-10 leading-relaxed">
          Deliver your photos securely. Let clients browse, heart their favourites, and you deliver exactly what they love.
        </p>

        <div className="hero-ctas flex flex-col sm:flex-row gap-4">
          <GoldButton onClick={() => navigate('/signup')} size="lg" icon={<Star size={16} />}>
            Start Your Studio Free
          </GoldButton>
          <GoldButton onClick={() => navigate('/login')} size="lg" variant="outline">
            Sign In
          </GoldButton>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-gold-500/50" />
          <p className="text-xs text-[var(--text-tertiary)]">Scroll to explore</p>
        </div>
      </section>

      {/* Features */}
      <section className="features-section py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-500 text-center mb-3">Features</p>
          <h2 className="text-3xl font-semibold text-center mb-14 text-[var(--text-primary)]">
            Everything a studio needs
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Secure Delivery', desc: 'Clients view-only. No downloads. Watermarks protect your work while it\'s being reviewed.' },
              { icon: Zap, title: 'Fast Gallery', desc: 'Photos compressed on upload for instant browser loading. Original quality preserved for delivery.' },
              { icon: Download, title: 'Smart Downloads', desc: 'Download only what clients loved. A zip of their favourites, ready for final editing.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="feature-card glass rounded-xl p-7 hover:border-[rgba(245,158,11,0.3)]
                hover:shadow-elevated transition-all duration-300 hover:-translate-y-1">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted)] flex items-center justify-center mb-5">
                  <Icon size={18} className="text-gold-500" />
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="steps-section py-24 px-6" style={{ background: 'var(--bg-surface)' }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-500 text-center mb-3">Process</p>
          <h2 className="text-3xl font-semibold text-center mb-14 text-[var(--text-primary)]">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: '01', title: 'Upload Your Photos', desc: 'Create an event, upload your shots. We compress them for fast viewing while keeping originals safe.' },
              { n: '02', title: 'Clients Browse & Heart', desc: 'Send your client a secure login. They browse the gallery and heart the photos they want.' },
              { n: '03', title: 'Download Favourites', desc: 'You download a zip of exactly the photos they loved — originals, ready for final delivery.' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="step-item text-center">
                <div className="w-12 h-12 rounded-full border-2 border-gold-500 flex items-center justify-center
                  mx-auto mb-5 font-display font-semibold text-gold-500 text-sm">
                  {n}
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <h2 className="font-display text-4xl font-semibold text-[var(--text-primary)] mb-4">
          Ready to deliver work they'll <span className="text-gold-shimmer">never forget?</span>
        </h2>
        <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
          Join studios already using Webzspot Studio to deliver a gallery experience their clients rave about.
        </p>
        <GoldButton onClick={() => navigate('/signup')} size="xl" icon={<ArrowRight size={18} />}>
          Create Your Studio
        </GoldButton>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t text-center" style={{ borderColor: 'var(--border-subtle)' }}>
        <p className="font-display text-gold-500 font-semibold">Webzspot Studio</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">© 2026 Webzspot Studio. All rights reserved.</p>
      </footer>
    </div>
  )
}
