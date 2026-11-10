import clsx from 'clsx'

export type CatMood = 'idle' | 'happy' | 'sad' | 'admin'

interface CatMascotProps {
  mood?: CatMood
  size?: number
  className?: string
  animated?: boolean
}

const HEAD = '#12122c'
const LINE = '#0ff1ca'

export function CatMascot({ mood = 'idle', size = 96, className, animated = true }: CatMascotProps) {
  const eyeColor = mood === 'sad' ? '#6b6b9a' : mood === 'admin' ? '#ffcf5c' : '#0ff1ca'

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={clsx('cat-mascot', animated && 'mascot-float', className)}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Neko-9 mascot (${mood})`}
    >
      <title>Neko-9</title>
      <g>
        <rect x="30" y="1" width="2" height="6" fill={LINE} opacity="0.7" />
        <rect x="29" y="0" width="4" height="2" fill="#ff2e88" opacity="0.9" />

        <rect x="9" y="6" width="13" height="17" fill={HEAD} stroke={LINE} strokeWidth="1.5" />
        <rect x="42" y="6" width="13" height="17" fill={HEAD} stroke={LINE} strokeWidth="1.5" />
        <rect x="12" y="10" width="7" height="9" fill="#ff2e88" opacity="0.55" />
        <rect x="45" y="10" width="7" height="9" fill="#ff2e88" opacity="0.55" />

        <rect x="8" y="18" width="48" height="36" fill={HEAD} stroke={LINE} strokeWidth="1.5" />
        <rect x="8" y="18" width="48" height="3" fill="#8a5cf6" opacity="0.18" />
        <rect x="28" y="20" width="8" height="2" fill="#8a5cf6" />

        {mood === 'happy' ? (
          <g fill={eyeColor}>
            <rect x="18" y="32" width="3" height="3" />
            <rect x="21" y="29" width="3" height="3" />
            <rect x="24" y="32" width="3" height="3" />
            <rect x="37" y="32" width="3" height="3" />
            <rect x="40" y="29" width="3" height="3" />
            <rect x="43" y="32" width="3" height="3" />
          </g>
        ) : (
          <g>
            <rect x="18" y="28" width="8" height="9" fill={eyeColor} />
            <rect x="38" y="28" width="8" height="9" fill={eyeColor} />
            <rect x="22" y="30" width="2" height="6" fill="#050510" />
            <rect x="42" y="30" width="2" height="6" fill="#050510" />
            <rect x="18" y="28" width="8" height="1" fill="#050510" opacity="0.35" />
            <rect x="38" y="28" width="8" height="1" fill="#050510" opacity="0.35" />
          </g>
        )}

        {mood === 'sad' && <rect x="18" y="38" width="2" height="5" fill="#0ff1ca" opacity="0.7" />}
        {mood === 'admin' && (
          <g fill="none" stroke="#ffcf5c" strokeWidth="1.5">
            <rect x="15" y="28" width="13" height="9" />
            <rect x="36" y="28" width="13" height="9" />
            <rect x="28" y="31" width="8" height="1.5" fill="#ffcf5c" stroke="none" />
          </g>
        )}

        <rect x="13" y="40" width="4" height="3" fill="#ff2e88" opacity="0.35" />
        <rect x="47" y="40" width="4" height="3" fill="#ff2e88" opacity="0.35" />

        <rect x="30" y="39" width="4" height="3" fill="#ff2e88" />
        <rect x="32" y="42" width="1.5" height="3" fill={LINE} opacity="0.65" />
        {mood === 'happy' ? (
          <g fill={LINE} opacity="0.7">
            <rect x="27" y="44" width="5" height="1.5" />
            <rect x="32" y="44" width="5" height="1.5" />
            <rect x="27" y="45.5" width="2" height="1.5" />
            <rect x="35" y="45.5" width="2" height="1.5" />
          </g>
        ) : (
          <g fill={LINE} opacity="0.55">
            <rect x="28" y="44" width="8" height="1.5" />
          </g>
        )}

        <g fill={LINE} opacity="0.45">
          <rect x="1" y="37" width="12" height="1" />
          <rect x="3" y="41" width="10" height="1" />
          <rect x="51" y="37" width="12" height="1" />
          <rect x="51" y="41" width="10" height="1" />
        </g>

        <rect x="9" y="50" width="46" height="2" fill="#8a5cf6" opacity="0.2" />
        <rect x="10" y="54" width="10" height="2" fill={LINE} opacity="0.5" />
        <rect x="44" y="54" width="10" height="2" fill={LINE} opacity="0.5" />
      </g>
    </svg>
  )
}
