import React from 'react'
import { Heart } from 'lucide-react'
import Drawer from '../ui/Drawer'
import useGalleryStore from '../../stores/galleryStore'
import useMediaToken from '../../hooks/useMediaToken'

function ThumbImage({ mediaId }) {
  const { token } = useMediaToken(mediaId)
  if (!token) return <div className="skeleton w-20 h-20 rounded-lg flex-shrink-0" />
  return (
    <img
      src={`/api/media/view/${token}`}
      alt=""
      className="w-20 h-20 object-cover rounded-lg flex-shrink-0 no-select"
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}

export default function FavouritesDrawer({ open, onClose, mediaList = [], eventId }) {
  const { getFavouritedMediaIds } = useGalleryStore()
  const favIds = getFavouritedMediaIds()
  const favouritedMedia = mediaList.filter(m => favIds.has(m.media_id))
  const count = favouritedMedia.length

  return (
    <>
      {/* Floating trigger button */}
      {!open && count > 0 && (
        <button
          onClick={onClose}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3
            bg-gold-500 hover:bg-gold-400 text-obsidian-base rounded-full shadow-gold-lg
            font-semibold text-sm transition-all duration-200 hover:scale-105"
        >
          <Heart size={16} className="fill-current" />
          <span>{count} favourite{count !== 1 ? 's' : ''}</span>
        </button>
      )}

      <Drawer open={open} onClose={onClose} title={`My Favourites (${count})`} side="bottom">
        {count === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Heart size={40} className="text-[var(--text-tertiary)] mb-3" />
            <p className="text-[var(--text-secondary)]">No favourites yet — tap the heart on any photo</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {favouritedMedia.map(m => <ThumbImage key={m.media_id} mediaId={m.media_id} />)}
          </div>
        )}
      </Drawer>
    </>
  )
}
