import { BaseLayout } from "./base-layout"

interface MagicLinkProps {
  confirmationUrl?: string
}

export default function MagicLink({
  confirmationUrl = "{{ .ConfirmationURL }}",
}: MagicLinkProps) {
  return (
    <BaseLayout
      preview="Sign in to HireMePlz"
      heading="Sign in to HireMePlz"
      body="Click the button below to securely sign in to your account. This link will expire in 24 hours."
      ctaText="Sign in"
      ctaUrl={confirmationUrl}
      footer="If you didn't request this email, you can safely ignore it."
    />
  )
}
