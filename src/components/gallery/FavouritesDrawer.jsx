import React, { useState } from 'react'
import { Heart, Download } from 'lucide-react'
import Drawer from '../ui/Drawer'
import GoldButton from '../ui/GoldButton'
import useGalleryStore from '../../stores/galleryStore'
import useMediaToken from '../../hooks/useMediaToken'
import { mediaViewUrl } from '../../utils/apiUrl'
import { downloadFavouritesZip } from '../../api/media'
import useAuthStore from '../../stores/authStore'
import toast from 'react-hot-toast'

function ThumbImage({ media }) {
  const { token } = useMediaToken(media.media_url ? null : media.media_id)
  const src = media.media_url || (token ? mediaViewUrl(token) : null)
  if (!src) return <div className="skeleton w-20 h-20 rounded-lg flex-shrink-0" />
  return (
    <img
      src={src}
      alt=""
      className="w-20 h-20 object-cover rounded-lg flex-shrink-0 no-select"
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}

export default function FavouritesDrawer({ open, onClose, mediaList = [], eventId, eventName, allowDownload }) {
  const { user } = useAuthStore()
  const { getFavouritedMediaIds } = useGalleryStore()
  const [downloading, setDownloading] = useState(false)
  const favIds = getFavouritedMediaIds()
  const favouritedMedia = mediaList.filter(m => favIds.has(m.media_id))
  const count = favouritedMedia.length

  const handleDownload = async () => {
    if (!eventId || !user?.user_id || count === 0) return
    setDownloading(true)
    try {
      const safeName = (eventName || 'event').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'event'
      await downloadFavouritesZip(eventId, user.user_id, `${safeName}_my_favourites.zip`)
      toast.success('Download started!')
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Download failed — downloads may be disabled for this event')
    } finally {
      setDownloading(false)
    }
  }

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
          <>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {favouritedMedia.map(m => <ThumbImage key={m.media_id} media={m} />)}
            </div>
            <div className="mt-4 flex items-center justify-end gap-3">
              {allowDownload ? (
                <GoldButton size="sm" icon={<Download size={14} />} loading={downloading} onClick={handleDownload}>
                  Download Favourites
                </GoldButton>
              ) : (
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Downloads are disabled for this event by the studio
                </span>
              )}
            </div>
          </>
        )}
      </Drawer>
    </>
  )
}
