import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './stores/authStore'
import SkeletonLoader from './components/ui/SkeletonLoader'
import { ShutterProvider } from './context/ShutterContext'

// Lazy-loaded pages
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))

const AdminDashboard = lazy(() => import('./pages/superadmin/Dashboard'))
const AdminStudios = lazy(() => import('./pages/superadmin/Studios'))
const AdminUsers = lazy(() => import('./pages/superadmin/Users'))
const AdminEvents = lazy(() => import('./pages/superadmin/Events'))

const StudioDashboard = lazy(() => import('./pages/studio/Dashboard'))
const StudioEventDetail = lazy(() => import('./pages/studio/EventDetail'))
const StudioSettings = lazy(() => import('./pages/studio/Settings'))
const StudioAccessBoard = lazy(() => import('./pages/studio/AccessBoard'))

const Gallery = lazy(() => import('./pages/gallery/Gallery'))
const GalleryFavourites = lazy(() => import('./pages/gallery/Favourites'))

const AccountSettings = lazy(() => import('./pages/shared/AccountSettings'))
const NotFound = lazy(() => import('./pages/shared/NotFound'))
const Unauthorized = lazy(() => import('./pages/shared/Unauthorized'))

function ProtectedRoute({ children, allowedRoles }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />
  }
  return children
}

function GuestRoute({ children }) {
  const { token, user } = useAuthStore()
  if (token) {
    if (user?.role === 'SUPER_ADMIN') return <Navigate to="/admin" replace />
    if (user?.role === 'ADMIN') return <Navigate to="/studio" replace />
    return <Navigate to="/gallery" replace />
  }
  return children
}

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-base)' }}>
    <SkeletonLoader type="page" />
  </div>
)

export default function App() {
  return (
    <ShutterProvider>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />

          {/* Super Admin */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/studios" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminStudios /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/events" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminEvents /></ProtectedRoute>} />

          {/* Studio (Admin) */}
          <Route path="/studio" element={<ProtectedRoute allowedRoles={['ADMIN']}><StudioDashboard /></ProtectedRoute>} />
          <Route path="/studio/access" element={<ProtectedRoute allowedRoles={['ADMIN']}><StudioAccessBoard /></ProtectedRoute>} />
          <Route path="/studio/events/:id" element={<ProtectedRoute allowedRoles={['ADMIN']}><StudioEventDetail /></ProtectedRoute>} />
          <Route path="/studio/settings" element={<ProtectedRoute allowedRoles={['ADMIN']}><StudioSettings /></ProtectedRoute>} />

          {/* Client Gallery */}
          <Route path="/gallery" element={<ProtectedRoute allowedRoles={['USER']}><Gallery /></ProtectedRoute>} />
          <Route path="/gallery/:eventId" element={<ProtectedRoute allowedRoles={['USER']}><Gallery /></ProtectedRoute>} />
          <Route path="/gallery/:eventId/favourites" element={<ProtectedRoute allowedRoles={['USER']}><GalleryFavourites /></ProtectedRoute>} />

          {/* Shared */}
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN','USER']}><AccountSettings /></ProtectedRoute>} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ShutterProvider>
  )
}
