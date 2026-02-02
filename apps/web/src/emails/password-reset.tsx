import { BaseLayout } from "./base-layout"

interface PasswordResetProps {
  confirmationUrl?: string
}

export default function PasswordReset({
  confirmationUrl = "{{ .ConfirmationURL }}",
}: PasswordResetProps) {
  return (
    <BaseLayout
      preview="Reset your HireMePlz password"
      heading="Reset your password"
      body="We received a request to reset your password. Click the button below to choose a new one."
      ctaText="Reset password"
      ctaUrl={confirmationUrl}
      footer="If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged."
    />
  )
}
