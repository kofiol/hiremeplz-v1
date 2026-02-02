import { BaseLayout } from "./base-layout"

interface EmailChangeProps {
  confirmationUrl?: string
}

export default function EmailChange({
  confirmationUrl = "{{ .ConfirmationURL }}",
}: EmailChangeProps) {
  return (
    <BaseLayout
      preview="Confirm your new email address on HireMePlz"
      heading="Confirm email change"
      body="Click the button below to confirm changing your email address to a new one."
      ctaText="Confirm new email"
      ctaUrl={confirmationUrl}
      footer="If you didn't request this change, please secure your account immediately."
    />
  )
}
