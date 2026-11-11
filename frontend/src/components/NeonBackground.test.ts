import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NeonBackground } from './NeonBackground'

// Exercise the canvas effect without requiring a browser or a native canvas renderer.
const effect = vi.hoisted(() => ({
  canvas: null as unknown as HTMLCanvasElement,
  mount: (() => undefined) as () => (() => void) | undefined,
}))
vi.mock('react', () => ({
  useRef: () => ({ current: effect.canvas }),
  useEffect: (mount: typeof effect.mount) => { effect.mount = mount },
}))

let frames: Map<number, FrameRequestCallback>
let viewport: EventTarget & { innerWidth: number; innerHeight: number }
let page: EventTarget & { hidden: boolean }
let motion: EventTarget & { matches: boolean }
let paint: ReturnType<typeof vi.fn>
let cleanup: (() => void) | undefined

function mount() {
  NeonBackground()
  cleanup = effect.mount()
}

function refresh(time: number) {
  const callbacks = [...frames.values()]
  frames.clear()
  callbacks.forEach((callback) => callback(time))
}

beforeEach(() => {
  frames = new Map()
  let nextFrame = 0
  paint = vi.fn()
  const context = {
    clearRect: paint, setTransform: vi.fn(), beginPath: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fillRect: vi.fn(),
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
  }
  effect.canvas = { getContext: () => context, style: {} } as unknown as HTMLCanvasElement
  motion = Object.assign(new EventTarget(), { matches: false })
  viewport = Object.assign(new EventTarget(), {
    innerWidth: 1200, innerHeight: 800, devicePixelRatio: 2,
    matchMedia: () => motion,
  })
  page = Object.assign(new EventTarget(), { hidden: false })
  vi.stubGlobal('window', viewport)
  vi.stubGlobal('document', page)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback)
    return nextFrame
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id) })
  vi.spyOn(performance, 'now').mockReturnValue(0)
})

afterEach(() => {
  cleanup?.()
  cleanup = undefined
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('decorative background scheduling', () => {
  it('keeps one loop, draws at 30 FPS on a 60 Hz display, and stops fully on unmount', () => {
    mount()
    expect(frames.size).toBe(1)
    for (let i = 1; i <= 60; i++) refresh(i * 1000 / 60)
    expect(paint).toHaveBeenCalledTimes(31)
    expect(frames.size).toBe(1)
    cleanup!()
    expect(frames.size).toBe(0)
    refresh(2000)
    expect(paint).toHaveBeenCalledTimes(31)
    // React StrictMode mounts the effect again after cleaning it up.
    mount()
    expect(frames.size).toBe(1)
  })

  it('pauses while hidden, resumes once, and reacts to reduced-motion changes', () => {
    mount()
    page.hidden = true
    page.dispatchEvent(new Event('visibilitychange'))
    expect(frames.size).toBe(0)
    refresh(1000)
    expect(paint).toHaveBeenCalledTimes(1)
    page.hidden = false
    page.dispatchEvent(new Event('visibilitychange'))
    expect(frames.size).toBe(1)
    motion.matches = true
    motion.dispatchEvent(new Event('change'))
    expect(frames.size).toBe(0)
    motion.matches = false
    motion.dispatchEvent(new Event('change'))
    expect(frames.size).toBe(1)
    cleanup!()
    paint.mockClear()
    page.dispatchEvent(new Event('visibilitychange'))
    motion.dispatchEvent(new Event('change'))
    viewport.dispatchEvent(new Event('resize'))
    expect(frames.size).toBe(0)
    expect(paint).not.toHaveBeenCalled()
  })

  it('repaints the static reduced-motion background after resizing without starting a loop', () => {
    motion.matches = true
    mount()
    expect(paint).toHaveBeenCalledTimes(1)
    expect(frames.size).toBe(0)
    viewport.innerWidth = 900
    viewport.dispatchEvent(new Event('resize'))
    expect(effect.canvas.width).toBe(1800)
    expect(paint).toHaveBeenLastCalledWith(0, 0, 900, 800)
    expect(paint).toHaveBeenCalledTimes(2)
    expect(frames.size).toBe(0)
  })
})
