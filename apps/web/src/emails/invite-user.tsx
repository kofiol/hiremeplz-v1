import { BaseLayout } from "./base-layout"

interface InviteUserProps {
  confirmationUrl?: string
}

export default function InviteUser({
  confirmationUrl = "{{ .ConfirmationURL }}",
}: InviteUserProps) {
  return (
    <BaseLayout
      preview="You've been invited to join HireMePlz"
      heading="You've been invited"
      body="You've been invited to join HireMePlz. Click the button below to accept the invitation and set up your account."
      ctaText="Accept invitation"
      ctaUrl={confirmationUrl}
      footer="If you weren't expecting this invitation, you can safely ignore this email."
    />
  )
}
