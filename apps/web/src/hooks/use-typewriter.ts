"use client"

import { useRef, useEffect, useCallback } from "react"

export type TypewriterControls = {
  /** The ref containing the full text to animate toward */
  targetRef: React.MutableRefObject<string>
  /** The ref tracking the current cursor position */
  indexRef: React.MutableRefObject<number>
  /** Start the rAF loop (idempotent) */
  start: () => void
  /** Stop the rAF loop */
  stop: () => void
  /** Instantly flush all pending text and stop */
  flush: () => string
  /** Reset target and index to empty */
  reset: () => void
}

/**
 * Smooth character-by-character reveal for streamed text.
 *
 * Uses requestAnimationFrame for 60fps rendering. Each frame reveals
 * enough characters to catch up within ~120ms, so tokens appear
 * almost instantly but with a smooth per-character feel.
 */
export function useTypewriter(
  onUpdate: (text: string) => void
): TypewriterControls {
  const targetRef = useRef("")
  const indexRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  })

  const tick = useCallback(() => {
    const target = targetRef.current
    const idx = indexRef.current

    if (idx < target.length) {
      const behind = target.length - idx
      // Catch up within ~250ms (~15 frames at 60fps)
      // Always reveal at least 1 char per frame for smoothness
      const step = Math.max(1, Math.ceil(behind / 15))
      indexRef.current = Math.min(idx + step, target.length)
      onUpdateRef.current(target.slice(0, indexRef.current))
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const start = useCallback(() => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const flush = useCallback(() => {
    stop()
    indexRef.current = targetRef.current.length
    const text = targetRef.current
    onUpdateRef.current(text)
    return text
  }, [stop])

  const reset = useCallback(() => {
    stop()
    targetRef.current = ""
    indexRef.current = 0
  }, [stop])

  useEffect(() => {
    return () => stop()
  }, [stop])

  return { targetRef, indexRef, start, stop, flush, reset }
}
