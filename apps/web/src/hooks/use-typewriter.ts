"use client"

import { useRef, useEffect, useCallback } from "react"

export type TypewriterControls = {
  /** The ref containing the full text to animate toward */
  targetRef: React.MutableRefObject<string>
  /** The ref tracking the current cursor position */
  indexRef: React.MutableRefObject<number>
  /** Start the typewriter interval (idempotent) */
  start: () => void
  /** Stop the typewriter interval */
  stop: () => void
  /** Instantly flush all pending text */
  flush: () => string
  /** Reset target and index to empty */
  reset: () => void
  /** Wait for the typewriter to catch up to target */
  waitForComplete: () => Promise<void>
}

/**
 * Extracted from onboarding-chatbot.tsx (lines 358-406).
 * Provides a char-by-char typewriter effect for streaming text.
 *
 * @param onUpdate - called with the current visible text on each tick
 */
export function useTypewriter(
  onUpdate: (text: string) => void
): TypewriterControls {
  const targetRef = useRef("")
  const indexRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  })

  const start = useCallback(() => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => {
      const target = targetRef.current
      const idx = indexRef.current
      if (idx < target.length) {
        const behind = target.length - idx
        const step = behind > 80 ? 4 : behind > 40 ? 3 : behind > 15 ? 2 : 1
        indexRef.current = Math.min(idx + step, target.length)
        onUpdateRef.current(target.slice(0, indexRef.current))
      }
    }, 18)
  }, [])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const flush = useCallback(() => {
    indexRef.current = targetRef.current.length
    const text = targetRef.current
    onUpdateRef.current(text)
    return text
  }, [])

  const reset = useCallback(() => {
    stop()
    targetRef.current = ""
    indexRef.current = 0
  }, [stop])

  const waitForComplete = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const check = () => {
        if (indexRef.current >= targetRef.current.length) {
          resolve()
        } else {
          setTimeout(check, 20)
        }
      }
      check()
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => stop()
  }, [stop])

  return { targetRef, indexRef, start, stop, flush, reset, waitForComplete }
}
