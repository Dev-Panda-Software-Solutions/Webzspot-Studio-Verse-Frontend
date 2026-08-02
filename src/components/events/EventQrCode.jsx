import React, { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Download } from 'lucide-react'
import GoldButton from '../ui/GoldButton'

// The QR code just encodes a URL on this same frontend — no backend image
// generation needed. Guests scanning it land on the public registration page.
export default function EventQrCode({ eventId, size = 140 }) {
  const canvasRef = useRef(null)
  const registerUrl = `${window.location.origin}/register/${eventId}`

  const handleDownload = () => {
    const canvas = canvasRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `event-qr-${eventId}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={canvasRef} className="p-3 rounded-xl" style={{ background: '#fff' }}>
        <QRCodeCanvas value={registerUrl} size={size} level="M" />
      </div>
      <GoldButton size="sm" variant="outline" icon={<Download size={12} />} onClick={handleDownload}>
        Download QR
      </GoldButton>
    </div>
  )
}
