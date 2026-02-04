"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

type WelcomeScreenProps = {
  firstName: string
  isLoading: boolean
  onStart: () => void
}

export function WelcomeScreen({ firstName, isLoading, onStart }: WelcomeScreenProps) {
  return (
    <motion.div
      key="welcome"
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35 }}
      className="flex flex-1 flex-col items-center justify-center p-6 min-h-0"
    >
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="text-center text-3xl font-semibold tracking-tight sm:text-4xl"
        suppressHydrationWarning
      >
        Welcome, {firstName}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mt-3 max-w-sm text-center text-base text-muted-foreground"
      >
        Our AI agent will build your freelance profile in just a few minutes.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8"
      >
        <Button
          size="lg"
          className="gap-2 px-10 py-6 text-base shadow-[0_0_20px_oklch(from_var(--primary)_l_c_h_/_0.15)] transition-shadow hover:shadow-[0_0_30px_oklch(from_var(--primary)_l_c_h_/_0.25)]"
          onClick={onStart}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Starting...
            </>
          ) : (
            "Get Started"
          )}
        </Button>
      </motion.div>
    </motion.div>
  )
}
