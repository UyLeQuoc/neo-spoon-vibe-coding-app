import type { LinksFunction } from '@remix-run/cloudflare'
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react'
import tailwindReset from '@unocss/reset/tailwind-compat.css?url'
import xtermStyles from '@xterm/xterm/css/xterm.css?url'
import { useEffect, useId } from 'react'
import { ToastContainer } from 'react-toastify'
import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url'
import { createHead } from 'remix-island'
import { ClientOnly } from 'remix-utils/client-only'
import { FloatingIcons } from './components/FloatingIcons.client'
import { QueryProvider } from './lib/providers/QueryProvider'
import globalStyles from './styles/index.scss?url'
import { stripIndents } from './utils/stripIndent'

import 'virtual:uno.css'
import { cn } from './lib/utils'

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml'
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com'
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous'
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
  }
]

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    document.querySelector('html')?.setAttribute('data-theme', 'light');
  }
`

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    {/** biome-ignore lint/security/noDangerouslySetInnerHtml: trusted content */}
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
))

interface GridPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number
  height?: number
  x?: number
  y?: number
  squares?: Array<[x: number, y: number]>
  strokeDasharray?: string
  className?: string
  [key: string]: unknown
}

function GridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = "0",
  squares,
  className,
  ...props
}: GridPatternProps) {
  const id = useId()

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
      {squares && (
        <svg x={x} y={y} className="overflow-visible" aria-hidden="true">
          {squares.map(([x, y]) => (
            <rect
              strokeWidth="0"
              key={`${x}-${y}`}
              width={width - 1}
              height={height - 1}
              x={x * width + 1}
              y={y * height + 1}
            />
          ))}
        </svg>
      )}
    </svg>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', 'light')
  }, [])

  return (
    <>
      {children}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <ScrollRestoration />
      <Scripts />
    </>
  )
}

export default function App() {
  return (
    <QueryProvider>
      
      <div className='w-screen h-screen overflow-hidden relative'>
        <GridPattern
         className='opacity-30'
          width={40}
          height={40}
          x={0}
          y={0}
        />
        <ClientOnly>{() => <FloatingIcons />}</ClientOnly>
        <Outlet />
      </div>
    </QueryProvider>
  )
}
