import fs from 'node:fs/promises'
import { basename } from 'node:path'
import { globSync } from 'fast-glob'
import { defineConfig, presetIcons, presetUno, presetWebFonts, transformerDirectives } from 'unocss'

const iconPaths = globSync('./icons/*.svg')

const collectionName = 'neozero'

const customIconCollection = iconPaths.reduce(
  (acc, iconPath) => {
    const [iconName] = basename(iconPath).split('.')

    acc[collectionName] ??= {}
    acc[collectionName][iconName] = async () => fs.readFile(iconPath, 'utf8')

    return acc
  },
  {} as Record<string, Record<string, () => Promise<string>>>
)

const BASE_COLORS = {
  white: '#FFFFFF',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A'
  },
  accent: {
    50: '#E6FDF7',
    100: '#CCFCEF',
    200: '#99F9DF',
    300: '#66F6CF',
    400: '#33F3BF',
    500: '#01E698',
    600: '#01B87A',
    700: '#018A5C',
    800: '#015C3D',
    900: '#012E1F',
    950: '#001710'
  },
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16'
  },
  orange: {
    50: '#FFFAEB',
    100: '#FEEFC7',
    200: '#FEDF89',
    300: '#FEC84B',
    400: '#FDB022',
    500: '#F79009',
    600: '#DC6803',
    700: '#B54708',
    800: '#93370D',
    900: '#792E0D'
  },
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A'
  }
}

const COLOR_PRIMITIVES = {
  ...BASE_COLORS,
  alpha: {
    white: generateAlphaPalette(BASE_COLORS.white),
    gray: generateAlphaPalette(BASE_COLORS.gray[900]),
    red: generateAlphaPalette(BASE_COLORS.red[500]),
    accent: generateAlphaPalette(BASE_COLORS.accent[500])
  }
}

export default defineConfig({
  shortcuts: {
    'neozero-ease-cubic-bezier': 'ease-[cubic-bezier(0.4,0,0.2,1)]',
    'transition-theme': 'transition-[background-color,border-color,color] duration-150 neozero-ease-cubic-bezier',
    kdb: 'bg-neozero-elements-code-background text-neozero-elements-code-text py-1 px-1.5 rounded-md',
    'max-w-chat': 'max-w-[var(--chat-max-width)]'
  },
  rules: [
    /**
     * This shorthand doesn't exist in Tailwind and we overwrite it to avoid
     * any conflicts with minified CSS classes.
     */
    ['b', {}]
  ],
  theme: {
    colors: {
      ...COLOR_PRIMITIVES,
      neozero: {
        elements: {
          borderColor: 'var(--neozero-elements-borderColor)',
          borderColorActive: 'var(--neozero-elements-borderColorActive)',
          background: {
            depth: {
              1: 'var(--neozero-elements-bg-depth-1)',
              2: 'var(--neozero-elements-bg-depth-2)',
              3: 'var(--neozero-elements-bg-depth-3)',
              4: 'var(--neozero-elements-bg-depth-4)'
            }
          },
          textPrimary: 'var(--neozero-elements-textPrimary)',
          textSecondary: 'var(--neozero-elements-textSecondary)',
          textTertiary: 'var(--neozero-elements-textTertiary)',
          code: {
            background: 'var(--neozero-elements-code-background)',
            text: 'var(--neozero-elements-code-text)'
          },
          button: {
            primary: {
              background: 'var(--neozero-elements-button-primary-background)',
              backgroundHover: 'var(--neozero-elements-button-primary-backgroundHover)',
              text: 'var(--neozero-elements-button-primary-text)'
            },
            secondary: {
              background: 'var(--neozero-elements-button-secondary-background)',
              backgroundHover: 'var(--neozero-elements-button-secondary-backgroundHover)',
              text: 'var(--neozero-elements-button-secondary-text)'
            },
            danger: {
              background: 'var(--neozero-elements-button-danger-background)',
              backgroundHover: 'var(--neozero-elements-button-danger-backgroundHover)',
              text: 'var(--neozero-elements-button-danger-text)'
            }
          },
          item: {
            contentDefault: 'var(--neozero-elements-item-contentDefault)',
            contentActive: 'var(--neozero-elements-item-contentActive)',
            contentAccent: 'var(--neozero-elements-item-contentAccent)',
            contentDanger: 'var(--neozero-elements-item-contentDanger)',
            backgroundDefault: 'var(--neozero-elements-item-backgroundDefault)',
            backgroundActive: 'var(--neozero-elements-item-backgroundActive)',
            backgroundAccent: 'var(--neozero-elements-item-backgroundAccent)',
            backgroundDanger: 'var(--neozero-elements-item-backgroundDanger)'
          },
          actions: {
            background: 'var(--neozero-elements-actions-background)',
            code: {
              background: 'var(--neozero-elements-actions-code-background)'
            }
          },
          artifacts: {
            background: 'var(--neozero-elements-artifacts-background)',
            backgroundHover: 'var(--neozero-elements-artifacts-backgroundHover)',
            borderColor: 'var(--neozero-elements-artifacts-borderColor)',
            inlineCode: {
              background: 'var(--neozero-elements-artifacts-inlineCode-background)',
              text: 'var(--neozero-elements-artifacts-inlineCode-text)'
            }
          },
          messages: {
            background: 'var(--neozero-elements-messages-background)',
            linkColor: 'var(--neozero-elements-messages-linkColor)',
            code: {
              background: 'var(--neozero-elements-messages-code-background)'
            },
            inlineCode: {
              background: 'var(--neozero-elements-messages-inlineCode-background)',
              text: 'var(--neozero-elements-messages-inlineCode-text)'
            }
          },
          icon: {
            success: 'var(--neozero-elements-icon-success)',
            error: 'var(--neozero-elements-icon-error)',
            primary: 'var(--neozero-elements-icon-primary)',
            secondary: 'var(--neozero-elements-icon-secondary)',
            tertiary: 'var(--neozero-elements-icon-tertiary)'
          },
          preview: {
            addressBar: {
              background: 'var(--neozero-elements-preview-addressBar-background)',
              backgroundHover: 'var(--neozero-elements-preview-addressBar-backgroundHover)',
              backgroundActive: 'var(--neozero-elements-preview-addressBar-backgroundActive)',
              text: 'var(--neozero-elements-preview-addressBar-text)',
              textActive: 'var(--neozero-elements-preview-addressBar-textActive)'
            }
          },
          terminals: {
            background: 'var(--neozero-elements-terminals-background)',
            buttonBackground: 'var(--neozero-elements-terminals-buttonBackground)'
          },
          dividerColor: 'var(--neozero-elements-dividerColor)',
          loader: {
            background: 'var(--neozero-elements-loader-background)',
            progress: 'var(--neozero-elements-loader-progress)'
          },
          prompt: {
            background: 'var(--neozero-elements-prompt-background)'
          },
          sidebar: {
            dropdownShadow: 'var(--neozero-elements-sidebar-dropdownShadow)',
            buttonBackgroundDefault: 'var(--neozero-elements-sidebar-buttonBackgroundDefault)',
            buttonBackgroundHover: 'var(--neozero-elements-sidebar-buttonBackgroundHover)',
            buttonText: 'var(--neozero-elements-sidebar-buttonText)'
          },
          cta: {
            background: 'var(--neozero-elements-cta-background)',
            text: 'var(--neozero-elements-cta-text)'
          }
        }
      }
    }
  },
  transformers: [transformerDirectives()],
  presets: [
    presetUno({
      dark: {
        light: '[data-theme="light"]',
        dark: '[data-theme="dark"]'
      }
    }),
    presetIcons({
      warn: true,
      collections: {
        ...customIconCollection
      }
    }),
    presetWebFonts({
      fonts: {
        roboto: 'Roboto',
        'open-sans': 'Open Sans',
        oswald: 'Oswald'
      }
    })
  ]
})

/**
 * Generates an alpha palette for a given hex color.
 *
 * @param hex - The hex color code (without alpha) to generate the palette from.
 * @returns An object where keys are opacity percentages and values are hex colors with alpha.
 *
 * Example:
 *
 * ```
 * {
 *   '1': '#FFFFFF03',
 *   '2': '#FFFFFF05',
 *   '3': '#FFFFFF08',
 * }
 * ```
 */
function generateAlphaPalette(hex: string) {
  return [1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].reduce(
    (acc, opacity) => {
      const alpha = Math.round((opacity / 100) * 255)
        .toString(16)
        .padStart(2, '0')

      acc[opacity] = `${hex}${alpha}`

      return acc
    },
    {} as Record<number, string>
  )
}
