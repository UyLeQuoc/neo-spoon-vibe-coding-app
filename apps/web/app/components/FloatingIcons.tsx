import { useLocation } from 'react-router'

interface FloatingIconProps {
  emoji: string
  position: string
  delay: number
}

function FloatingIcon({ emoji, position, delay }: FloatingIconProps) {
  return (
    <div
      className={`absolute ${position} text-4xl md:text-5xl animate-float`}
      style={{
        animationDelay: `${delay}s`
      }}
    >
      <div className="filter drop-shadow-lg">{emoji}</div>
    </div>
  )
}

export function FloatingIcons() {
  const location = useLocation()
  const isIndex = location.pathname === '/'

  if (!isIndex) {
    return null
  }

  return (
    <>
      <FloatingIcon emoji="🥐" position="top-40 left-50" delay={0} />
      <FloatingIcon emoji="🍔" position="top-50 right-50" delay={0.5} />
      <FloatingIcon emoji="🍲" position="bottom-50 left-50" delay={1} />
      <FloatingIcon emoji="🍜" position="bottom-40 right-50" delay={1.5} />
    </>
  )
}
