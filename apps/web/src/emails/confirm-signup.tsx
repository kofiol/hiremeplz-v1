import { BaseLayout } from "./base-layout"

interface ConfirmSignupProps {
  confirmationUrl?: string
}

export default function ConfirmSignup({
  confirmationUrl = "{{ .ConfirmationURL }}",
}: ConfirmSignupProps) {
  return (
    <BaseLayout
      preview="Confirm your email to get started with HireMePlz"
      heading="Confirm your email"
      body="Thanks for signing up for HireMePlz. Click the button below to confirm your email address and get started."
      ctaText="Confirm email address"
      ctaUrl={confirmationUrl}
      footer="If you didn't create an account, you can safely ignore this email."
    />
  )
}
