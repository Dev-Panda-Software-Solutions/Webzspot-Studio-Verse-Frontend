import { create } from 'zustand'

// Dark/light toggle is disabled site-wide for now — the store always reports
// 'light' and setTheme/toggleTheme are no-ops. Original logic kept commented
// out below so the toggle can be restored later without rebuilding it.
const useThemeStore = create((set) => ({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},

  // theme: localStorage.getItem('sv-theme') || 'dark',
  // setTheme: (t) => {
  //   localStorage.setItem('sv-theme', t)
  //   document.documentElement.classList.toggle('dark', t === 'dark')
  //   set({ theme: t })
  // },
  // toggleTheme: () => {
  //   const current = localStorage.getItem('sv-theme') || 'dark'
  //   const next = current === 'dark' ? 'light' : 'dark'
  //   localStorage.setItem('sv-theme', next)
  //   document.documentElement.classList.toggle('dark', next === 'dark')
  //   set({ theme: next })
  // }
}))

export default useThemeStore
