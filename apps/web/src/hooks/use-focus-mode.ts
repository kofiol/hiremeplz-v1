import { useState, useCallback, useEffect } from "react"

const STORAGE_KEY = "hiremeplz:focus-mode"
const OPACITY_STORAGE_KEY = "hiremeplz:focus-mode-opacity"
const EVENT_KEY = "hiremeplz:focus-mode-changed"

export function useFocusMode(): [
  boolean,
  (enabled: boolean) => void,
  number,
  (opacity: number) => void,
] {
  const [enabled, setEnabledState] = useState(true)
  const [opacity, setOpacityState] = useState(10)

  useEffect(() => {
    const syncState = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === "false") {
          setEnabledState(false)
        } else {
          setEnabledState(true)
        }
        
        const storedOpacity = localStorage.getItem(OPACITY_STORAGE_KEY)
        if (storedOpacity) {
          setOpacityState(parseInt(storedOpacity, 10))
        }
      } catch {
        // localStorage unavailable
      }
    }

    // Initial load
    syncState()

    // Listen for custom events (same window)
    window.addEventListener(EVENT_KEY, syncState)
    
    // Listen for storage events (other tabs)
    window.addEventListener("storage", syncState)

    return () => {
      window.removeEventListener(EVENT_KEY, syncState)
      window.removeEventListener("storage", syncState)
    }
  }, [])

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value)
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
      window.dispatchEvent(new Event(EVENT_KEY))
    } catch {
      // ignore
    }
  }, [])

  const setOpacity = useCallback((value: number) => {
    setOpacityState(value)
    try {
      localStorage.setItem(OPACITY_STORAGE_KEY, String(value))
      window.dispatchEvent(new Event(EVENT_KEY))
    } catch {
      // ignore
    }
  }, [])

  return [enabled, setEnabled, opacity, setOpacity]
}
