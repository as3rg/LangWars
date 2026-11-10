import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  z: number
  phase: number
  hue: 'cyan' | 'magenta' | 'violet'
}

export function NeonBackground() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let frame = 0

    const stars: Star[] = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random() * 0.85 + 0.15,
      phase: Math.random() * Math.PI * 2,
      hue: Math.random() > 0.84 ? 'magenta' : Math.random() > 0.7 ? 'violet' : 'cyan',
    }))

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const colorFor = (hue: Star['hue'], alpha: number) => {
      if (hue === 'magenta') return `rgba(255, 46, 136, ${alpha})`
      if (hue === 'violet') return `rgba(138, 92, 246, ${alpha})`
      return `rgba(15, 241, 202, ${alpha})`
    }

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height)

      const horizon = height * 0.74
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(15, 241, 202, 0.045)'
      for (let i = 0; i < 16; i++) {
        const y = horizon + Math.pow(i / 16, 2.2) * (height - horizon)
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      const vanishing = width * 0.5
      for (let i = -14; i <= 14; i++) {
        ctx.beginPath()
        ctx.moveTo(vanishing, horizon)
        ctx.lineTo(vanishing + i * (width / 10), height)
        ctx.stroke()
      }

      for (const star of stars) {
        const drift = reduced ? 0 : Math.sin(time / 4200 + star.phase) * 6
        const x = star.x * width + drift
        const y = star.y * height
        const twinkle = reduced ? 0.55 : 0.5 + 0.5 * Math.sin(time / 1300 + star.phase)
        const alpha = 0.1 + 0.5 * star.z * twinkle
        ctx.fillStyle = colorFor(star.hue, alpha)
        const size = star.z > 0.82 ? 2 : 1
        ctx.fillRect(x, y, size, size)
      }

      if (!reduced) {
        const streamPhase = (time / 60) % (height + 260)
        for (let i = 0; i < 3; i++) {
          const x = ((i + 0.5) / 3) * width + Math.sin(time / 2600 + i) * 40
          const y = ((height + 260) - ((streamPhase + i * 220) % (height + 260))) - 130
          const gradient = ctx.createLinearGradient(x, y, x, y + 120)
          gradient.addColorStop(0, 'rgba(15, 241, 202, 0)')
          gradient.addColorStop(0.5, `rgba(15, 241, 202, ${i === 1 ? 0.09 : 0.05})`)
          gradient.addColorStop(1, 'rgba(15, 241, 202, 0)')
          ctx.fillStyle = gradient
          ctx.fillRect(x, y, 1, 120)
        }
      }

      if (!reduced) frame = requestAnimationFrame(draw)
    }

    resize()
    draw(0)
    window.addEventListener('resize', resize)
    if (!reduced) frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="neon-bg" aria-hidden="true" />
}
