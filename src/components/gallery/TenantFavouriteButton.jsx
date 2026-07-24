import React, { useRef, useState } from 'react'
import { gsap } from 'gsap'
import { Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { addTenantFavourite, removeTenantFavourite } from '../../api/favourites'
import useTenantFavouriteStore from '../../stores/tenantFavouriteStore'
import toast from 'react-hot-toast'

const CONFETTI_COLORS = ['#F59E0B', '#FFFFFF', '#FB923C', '#FCD34D', '#F43F5E', '#34D399']

const CONFETTI = Array.from({ length: 18 }, (_, i) => {
  const angle = (i * Math.PI * 2) / 18 + (i % 2 === 0 ? 0.25 : -0.15)
  const distance = 28 + (i % 4) * 16
  const rect = i % 3 !== 0
  const w = rect ? 10 : 5 + (i % 3) * 2
  const h = rect ? 5 : 5 + (i % 3) * 2
  return { angle, distance, rect, w, h, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }
})

function ConfettiPiece({ angle, distance, rect, w, h, color }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        width: w, height: h,
        top: '50%', left: '50%',
        marginTop: -h / 2, marginLeft: -w / 2,
        background: color,
        borderRadius: rect ? 2 : '50%',
      }}
      initial={{ scale: 0, x: 0, y: 0, opacity: 1, rotate: 0 }}
      animate={{
        scale: [0, 1.3, 0.9, 0],
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        opacity: [1, 1, 0.8, 0],
        rotate: rect ? [0, 180] : 0,
      }}
      transition={{ duration: 0.65, ease: 'easeOut' }}
    />
  )
}

export default function TenantFavouriteButton({ mediaId, eventId, size = 16 }) {
  const { isFavourited, getFavId, add, remove, isPending, setPending } = useTenantFavouriteStore()
  const [burst, setBurst] = useState(false)
  const heartRef = useRef(null)
  const fav = isFavourited(mediaId)
  // Shared with the Lightbox's spacebar handler (tenantFavouriteStore.pendingIds)
  // so a click and a space-press on the same photo serialize instead of racing.
  const pending = isPending(mediaId)

  const handleClick = async (e) => {
    e.stopPropagation()
    if (pending) return
    setPending(mediaId, true)

    try {
      if (fav) {
        const favId = getFavId(mediaId)
        remove(mediaId)
        try {
          await removeTenantFavourite(favId)
        } catch {
          add(mediaId, favId)
          toast.error('Could not remove favourite')
        }
      } else {
        const tempId = `temp-${mediaId}`
        add(mediaId, tempId)
        setBurst(true)
        setTimeout(() => setBurst(false), 700)
        gsap.fromTo(heartRef.current,
          { scale: 1 },
          { scale: 1.6, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' }
        )
        try {
          const res = await addTenantFavourite({ event_id: eventId, media_id: mediaId })
          // res is already the JSON body { success, data: favourite, message }
          const realId = res?.data?.tenant_favourite_id
          if (realId) add(mediaId, realId)
        } catch {
          remove(mediaId)
          toast.error('Could not add favourite')
        }
      }
    } finally {
      setPending(mediaId, false)
    }
  }

  return (
    <div className="relative">
      {burst && CONFETTI.map((c, i) => <ConfettiPiece key={i} {...c} />)}
      <button
        ref={heartRef}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === ' ') e.preventDefault() }}
        title={fav ? 'Remove from studio favourites' : 'Add to studio favourites'}
        className={`p-2 rounded-full transition-all duration-200
          ${fav ? 'bg-gold-500/20' : 'bg-black/30 hover:bg-black/50'}`}
      >
        <Heart
          size={size}
          className={`transition-colors duration-200 ${fav ? 'fill-gold-500 text-gold-500' : 'text-white'}`}
        />
      </button>
    </div>
  )
}
