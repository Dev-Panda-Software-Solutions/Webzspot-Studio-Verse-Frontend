import { create } from 'zustand'

const useThemeStore = create((set) => ({
  theme: localStorage.getItem('sv-theme') || 'dark',
  setTheme: (t) => {
    localStorage.setItem('sv-theme', t)
    document.documentElement.classList.toggle('dark', t === 'dark')
    set({ theme: t })
  },
  toggleTheme: () => {
    const current = localStorage.getItem('sv-theme') || 'dark'
    const next = current === 'dark' ? 'light' : 'dark'
    localStorage.setItem('sv-theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    set({ theme: next })
  }
}))

export default useThemeStore
