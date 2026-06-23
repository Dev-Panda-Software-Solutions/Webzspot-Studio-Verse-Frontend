import useThemeStore from '../stores/themeStore'

export default function useTheme() {
  const { theme, setTheme, toggleTheme } = useThemeStore()
  return { theme, isDark: theme === 'dark', setTheme, toggleTheme }
}
