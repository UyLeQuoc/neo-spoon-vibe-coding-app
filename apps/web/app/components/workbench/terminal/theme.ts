import type { ITheme } from '@xterm/xterm'

const style = getComputedStyle(document.documentElement)
const cssVar = (token: string) => style.getPropertyValue(token) || undefined

export function getTerminalTheme(overrides?: ITheme): ITheme {
  return {
    cursor: cssVar('--neozero-elements-terminal-cursorColor'),
    cursorAccent: cssVar('--neozero-elements-terminal-cursorColorAccent'),
    foreground: cssVar('--neozero-elements-terminal-textColor'),
    background: cssVar('--neozero-elements-terminal-backgroundColor'),
    selectionBackground: cssVar('--neozero-elements-terminal-selection-backgroundColor'),
    selectionForeground: cssVar('--neozero-elements-terminal-selection-textColor'),
    selectionInactiveBackground: cssVar('--neozero-elements-terminal-selection-backgroundColorInactive'),

    // ansi escape code colors
    black: cssVar('--neozero-elements-terminal-color-black'),
    red: cssVar('--neozero-elements-terminal-color-red'),
    green: cssVar('--neozero-elements-terminal-color-green'),
    yellow: cssVar('--neozero-elements-terminal-color-yellow'),
    blue: cssVar('--neozero-elements-terminal-color-blue'),
    magenta: cssVar('--neozero-elements-terminal-color-magenta'),
    cyan: cssVar('--neozero-elements-terminal-color-cyan'),
    white: cssVar('--neozero-elements-terminal-color-white'),
    brightBlack: cssVar('--neozero-elements-terminal-color-brightBlack'),
    brightRed: cssVar('--neozero-elements-terminal-color-brightRed'),
    brightGreen: cssVar('--neozero-elements-terminal-color-brightGreen'),
    brightYellow: cssVar('--neozero-elements-terminal-color-brightYellow'),
    brightBlue: cssVar('--neozero-elements-terminal-color-brightBlue'),
    brightMagenta: cssVar('--neozero-elements-terminal-color-brightMagenta'),
    brightCyan: cssVar('--neozero-elements-terminal-color-brightCyan'),
    brightWhite: cssVar('--neozero-elements-terminal-color-brightWhite'),

    ...overrides
  }
}
