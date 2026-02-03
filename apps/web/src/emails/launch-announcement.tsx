import {
  Body,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import * as React from "react"

const colors = {
  bg: "#1e1d1a",
  card: "#262522",
  border: "#3d3b37",
  heading: "#e8e5de",
  text: "#9f9b90",
  muted: "#6b6860",
  faint: "#524f49",
  primary: "#3d9456",
  logo: "#c8c4ba",
  accent: "#e8e5de",
}

const fontStack = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  serif:
    "'DM Serif Display', Georgia, Cambria, 'Times New Roman', Times, serif",
}

interface LaunchAnnouncementProps {
  userName?: string
}

export default function LaunchAnnouncement({
  userName = "there",
}: LaunchAnnouncementProps) {
  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="DM Serif Display"
          fallbackFontFamily="Georgia"
          webFont={{
            url: "https://fonts.gstatic.com/s/dmseriftext/v12/rnCu-xZa_krGokauCeNq1wWyafOPXHIJErY.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Arial"
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v18/UcCo3FwrK3iLTcviYwY.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Arial"
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v18/UcCo3FwrK3iLTcviYwY.woff2",
            format: "woff2",
          }}
          fontWeight={600}
          fontStyle="normal"
        />
      </Head>
      <Preview>
        HireMePlz is live! Your AI agent for finding freelance work is ready.
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Logo */}
          <Section style={styles.logoSection}>
            <table cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td
                    style={{
                      width: 28,
                      height: 28,
                      backgroundColor: colors.logo,
                      borderRadius: 6,
                    }}
                    width={28}
                    height={28}
                  />
                  <td
                    style={{
                      paddingLeft: 10,
                      fontFamily: fontStack.sans,
                      fontSize: 17,
                      fontWeight: 600,
                      color: colors.logo,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    HireMePlz
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Launch Badge */}
          <Section style={styles.badgeSection}>
            <span style={styles.badge}>We&apos;re Live</span>
          </Section>

          {/* Heading */}
          <Text style={styles.heading}>Hey {userName},</Text>

          {/* Main message */}
          <Text style={styles.bodyText}>
            You signed up for the waitlist, and we didn&apos;t forget about you.
          </Text>

          <Text style={styles.bodyText}>
            <strong style={{ color: colors.heading }}>HireMePlz is now live — and it&apos;s 100% free.</strong>{" "}
            It&apos;s your personal AI agent that helps you find freelance work
            without the endless scrolling through job boards.
          </Text>

          {/* What you can do section */}
          <Section style={styles.featuresSection}>
            <Text style={styles.featuresHeading}>What you can do today:</Text>
            <table cellPadding={0} cellSpacing={0} style={{ width: "100%" }}>
              <tbody>
                <tr>
                  <td style={styles.featureItem}>
                    <span style={styles.checkmark}>→</span>
                    <span>Import your LinkedIn profile in one click</span>
                  </td>
                </tr>
                <tr>
                  <td style={styles.featureItem}>
                    <span style={styles.checkmark}>→</span>
                    <span>Let the AI understand your skills & experience</span>
                  </td>
                </tr>
                <tr>
                  <td style={styles.featureItem}>
                    <span style={styles.checkmark}>→</span>
                    <span>Get matched with opportunities that fit you</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* CTA Button */}
          <Section style={styles.buttonSection}>
            <Link href="https://hiremeplz.app" style={styles.button}>
              Start using HireMePlz
            </Link>
          </Section>

          <Text style={styles.smallText}>
            As an early user, your feedback shapes what we build next. Reply to
            this email anytime — I read every message.
          </Text>

          {/* Divider */}
          <Hr style={styles.hr} />

          {/* Signature */}
          <Text style={styles.signature}>
            Thanks for believing in this,
            <br />
            <strong style={{ color: colors.heading }}>Mark</strong>
          </Text>

          {/* Footer */}
          <Text style={styles.footer}>
            You&apos;re receiving this because you joined the HireMePlz waitlist.
            <br />
            <Link href="https://hiremeplz.app" style={styles.footerLink}>
              hiremeplz.app
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const styles = {
  body: {
    backgroundColor: colors.bg,
    fontFamily: fontStack.sans,
    margin: 0,
    padding: 0,
  } as React.CSSProperties,

  container: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    margin: "40px auto",
    padding: "40px",
    maxWidth: 520,
  } as React.CSSProperties,

  logoSection: {
    textAlign: "center" as const,
    marginBottom: 24,
  } as React.CSSProperties,

  badgeSection: {
    textAlign: "center" as const,
    marginBottom: 24,
  } as React.CSSProperties,

  badge: {
    backgroundColor: colors.primary,
    color: "#ffffff",
    fontFamily: fontStack.sans,
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    padding: "6px 12px",
    borderRadius: 999,
    display: "inline-block",
  } as React.CSSProperties,

  heading: {
    fontFamily: fontStack.serif,
    fontSize: 26,
    fontWeight: 400,
    color: colors.heading,
    textAlign: "left" as const,
    margin: "0 0 20px 0",
    lineHeight: "1.3",
  } as React.CSSProperties,

  bodyText: {
    fontSize: 15,
    lineHeight: "1.7",
    color: colors.text,
    textAlign: "left" as const,
    margin: "0 0 16px 0",
  } as React.CSSProperties,

  featuresSection: {
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: "20px 24px",
    margin: "24px 0",
  } as React.CSSProperties,

  featuresHeading: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.heading,
    margin: "0 0 16px 0",
  } as React.CSSProperties,

  featureItem: {
    fontSize: 14,
    lineHeight: "1.6",
    color: colors.text,
    paddingBottom: 10,
  } as React.CSSProperties,

  checkmark: {
    color: colors.primary,
    marginRight: 10,
    fontWeight: 600,
  } as React.CSSProperties,

  buttonSection: {
    textAlign: "center" as const,
    margin: "28px 0",
  } as React.CSSProperties,

  button: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    color: "#ffffff",
    display: "inline-block",
    fontFamily: fontStack.sans,
    fontSize: 14,
    fontWeight: 600,
    padding: "14px 36px",
    textDecoration: "none",
  } as React.CSSProperties,

  smallText: {
    fontSize: 14,
    lineHeight: "1.6",
    color: colors.muted,
    textAlign: "left" as const,
    margin: "0 0 24px 0",
    fontStyle: "italic" as const,
  } as React.CSSProperties,

  hr: {
    borderColor: colors.border,
    borderTop: `1px solid ${colors.border}`,
    margin: "0 0 20px 0",
  } as React.CSSProperties,

  signature: {
    fontSize: 14,
    lineHeight: "1.7",
    color: colors.text,
    margin: "0 0 24px 0",
  } as React.CSSProperties,

  footer: {
    fontSize: 12,
    lineHeight: "1.6",
    color: colors.faint,
    textAlign: "center" as const,
    margin: 0,
  } as React.CSSProperties,

  footerLink: {
    color: colors.muted,
    textDecoration: "none",
  } as React.CSSProperties,
}
