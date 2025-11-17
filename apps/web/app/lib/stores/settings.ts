import { map } from 'nanostores'

export interface Shortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  ctrlOrMetaKey?: boolean
  action: () => void
}

export interface Shortcuts {
  toggleTerminal: Shortcut
}

export interface Settings {
  shortcuts: Shortcuts
}

export const shortcutsStore = map<Shortcuts>({
  toggleTerminal: {
    key: 'j',
    ctrlOrMetaKey: true,
    action: () => void 0
  }
})

export const settingsStore = map<Settings>({
  shortcuts: shortcutsStore.get()
})

shortcutsStore.subscribe(shortcuts => {
  settingsStore.set({
    ...settingsStore.get(),
    shortcuts
  })
})
