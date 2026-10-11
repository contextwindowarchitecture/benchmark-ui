// The shedding viewer's playback (ui-plan.md 9.3; DESIGN.md 3.3, 3.4): a sweep's frames are a
// recorded process, so playing is a scrub over them. A GSAP tween is the clock: its progress maps to
// the frame index and nothing else, and the frame is React state every view renders from. The tween
// is made with useGSAP in the viewer's scope and reverted when the frame count or the motion
// preference changes; under reduced motion there is no tween, and seeking still works.

import { useCallback, useRef, useState, type RefObject } from "react"

import { gsap, useGSAP } from "@/lib/motion"

/** Frames per second while playing: the real run's longest sweep (737 frames) plays in a minute. */
export const FRAME_RATE = 12

export type FramePlayer = {
  playing: boolean
  /** Plays from the current frame (from the first after the last), or pauses. */
  toggle: () => void
  /** Pauses and moves to a frame, clamped to the sweep. */
  seek: (frame: number) => void
}

export function useFramePlayer({
  scope,
  count,
  frame,
  onFrame,
  reduced,
}: {
  scope: RefObject<HTMLElement | null>
  count: number
  frame: number
  onFrame: (frame: number) => void
  reduced: boolean
}): FramePlayer {
  const [playing, setPlaying] = useState(false)
  const tween = useRef<gsap.core.Tween | null>(null)
  const last = Math.max(count - 1, 0)

  useGSAP(
    () => {
      tween.current = null
      setPlaying(false)
      if (reduced || count < 2) return
      const clock = { progress: 0 }
      const t = gsap.to(clock, {
        progress: 1,
        duration: last / FRAME_RATE,
        ease: "none",
        paused: true,
        onUpdate: () => onFrame(Math.min(last, Math.floor(t.progress() * last + 1e-9))),
        onComplete: () => setPlaying(false),
      })
      tween.current = t
    },
    { scope, dependencies: [count, last, reduced], revertOnUpdate: true },
  )

  const seek = useCallback(
    (next: number) => {
      const bounded = Math.min(last, Math.max(0, Math.round(next)))
      const t = tween.current
      if (t) {
        t.pause()
        t.progress(last > 0 ? bounded / last : 0)
      }
      setPlaying(false)
      onFrame(bounded)
    },
    [last, onFrame],
  )

  const toggle = useCallback(() => {
    const t = tween.current
    if (!t) return
    if (playing) {
      t.pause()
      setPlaying(false)
      return
    }
    t.progress(frame >= last ? 0 : frame / last)
    t.play()
    setPlaying(true)
  }, [frame, last, playing])

  return { playing, toggle, seek }
}
