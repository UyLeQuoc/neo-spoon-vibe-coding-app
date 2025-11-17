import { atom } from 'nanostores'

export type Theme = 'dark' | 'light'

export const kTheme = 'bolt_theme'

export function themeIsDark() {
  return themeStore.get() === 'dark'
}

export const DEFAULT_THEME = 'light'

export const themeStore = atom<Theme>(initStore())

function initStore() {
  return 'light' as Theme
}

export function toggleTheme() {
  themeStore.set('light')
  localStorage.setItem(kTheme, 'light')
  document.querySelector('html')?.setAttribute('data-theme', 'light')
}
