import React from 'react'

function Bone({ className = '' }) {
  return <div className={`skeleton rounded-lg ${className}`} />
}

export default function SkeletonLoader({ type = 'card', count = 1 }) {
  if (type === 'page') return (
    <div className="w-full max-w-4xl mx-auto p-8 space-y-6">
      <Bone className="h-8 w-64" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Bone key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <Bone key={i} className="h-48 rounded-xl" />)}
      </div>
    </div>
  )

  if (type === 'photo-grid') return (
    <div className="masonry-grid">
      {[...Array(count)].map((_, i) => (
        <Bone key={i} className="rounded-xl mb-4" style={{ height: `${180 + (i % 3) * 80}px` }} />
      ))}
    </div>
  )

  if (type === 'stat') return (
    <div className="glass rounded-xl p-6 space-y-3">
      <div className="flex justify-between">
        <Bone className="h-4 w-20" />
        <Bone className="h-8 w-8 rounded-lg" />
      </div>
      <Bone className="h-10 w-28" />
      <Bone className="h-3 w-16" />
    </div>
  )

  if (type === 'event-card') return (
    <div className="glass rounded-xl overflow-hidden">
      <Bone className="h-40 rounded-none" />
      <div className="p-4 space-y-2">
        <Bone className="h-5 w-3/4" />
        <Bone className="h-3 w-1/2" />
      </div>
    </div>
  )

  if (type === 'table-row') return (
    <div className="flex items-center gap-4 py-3 px-4">
      <Bone className="h-8 w-8 rounded-full" />
      <Bone className="h-4 flex-1" />
      <Bone className="h-4 w-24" />
      <Bone className="h-4 w-20" />
    </div>
  )

  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="glass rounded-xl p-5 space-y-3">
          <Bone className="h-5 w-1/2" />
          <Bone className="h-3 w-3/4" />
          <Bone className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  )
}
