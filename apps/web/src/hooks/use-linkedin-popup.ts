import { useState, useCallback, useEffect } from "react"

const STORAGE_KEY = "hiremeplz:linkedin-popup"

export function useLinkedinPopup(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabledState] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === "true") {
        setEnabledState(true)
      }
    } catch {
      // localStorage unavailable
    }
  }, [])

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value)
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      // ignore
    }
  }, [])

  return [enabled, setEnabled]
}

// LinkedIn URL validation
const LINKEDIN_PROFILE_REGEX = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i

export function validateLinkedinUrl(url: string): {
  isValid: boolean
  error: string | null
} {
  const trimmed = url.trim()

  if (!trimmed) {
    return { isValid: false, error: null }
  }

  // Check if it looks like a LinkedIn URL at all
  if (!trimmed.toLowerCase().includes("linkedin.com")) {
    return { isValid: false, error: "Please enter a LinkedIn URL" }
  }

  // Check for /in/ profile path
  if (!trimmed.includes("/in/")) {
    return { isValid: false, error: "Please enter a profile URL (linkedin.com/in/...)" }
  }

  // Add https:// if missing for validation
  let urlToValidate = trimmed
  if (!urlToValidate.startsWith("http://") && !urlToValidate.startsWith("https://")) {
    urlToValidate = "https://" + urlToValidate
  }

  // Validate against regex
  if (!LINKEDIN_PROFILE_REGEX.test(urlToValidate)) {
    return { isValid: false, error: "Invalid LinkedIn profile URL format" }
  }

  return { isValid: true, error: null }
}

export function normalizeLinkedinUrl(url: string): string {
  let normalized = url.trim()
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = "https://" + normalized
  }
  // Remove trailing slash
  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1)
  }
  return normalized
}
