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
}

const fontStack = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  serif:
    "'DM Serif Display', Georgia, Cambria, 'Times New Roman', Times, serif",
}

interface BaseLayoutProps {
  preview: string
  heading: string
  body: string
  ctaText: string
  ctaUrl: string
  footer: string
}

export function BaseLayout({
  preview,
  heading,
  body,
  ctaText,
  ctaUrl,
  footer,
}: BaseLayoutProps) {
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
      <Preview>{preview}</Preview>
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

          {/* Heading */}
          <Text style={styles.heading}>{heading}</Text>

          {/* Body text */}
          <Text style={styles.bodyText}>{body}</Text>

          {/* CTA Button */}
          <Section style={styles.buttonSection}>
            <Link href={ctaUrl} style={styles.button}>
              {ctaText}
            </Link>
          </Section>

          {/* Divider */}
          <Hr style={styles.hr} />

          {/* Fallback link */}
          <Text style={styles.fallbackLabel}>
            If the button doesn&apos;t work, copy and paste this link into your
            browser:
          </Text>
          <Text style={styles.fallbackLink}>{ctaUrl}</Text>

          {/* Footer */}
          <Text style={styles.footer}>{footer}</Text>
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
    marginBottom: 32,
  } as React.CSSProperties,

  heading: {
    fontFamily: fontStack.serif,
    fontSize: 28,
    fontWeight: 400,
    color: colors.heading,
    textAlign: "center" as const,
    margin: "0 0 16px 0",
    lineHeight: "1.3",
  } as React.CSSProperties,

  bodyText: {
    fontSize: 15,
    lineHeight: "1.65",
    color: colors.text,
    textAlign: "center" as const,
    margin: "0 0 32px 0",
  } as React.CSSProperties,

  buttonSection: {
    textAlign: "center" as const,
    marginBottom: 32,
  } as React.CSSProperties,

  button: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    color: "#ffffff",
    display: "inline-block",
    fontFamily: fontStack.sans,
    fontSize: 14,
    fontWeight: 600,
    padding: "12px 32px",
    textDecoration: "none",
  } as React.CSSProperties,

  hr: {
    borderColor: colors.border,
    borderTop: `1px solid ${colors.border}`,
    margin: "0 0 20px 0",
  } as React.CSSProperties,

  fallbackLabel: {
    fontSize: 13,
    lineHeight: "1.6",
    color: colors.muted,
    textAlign: "center" as const,
    margin: "0 0 8px 0",
  } as React.CSSProperties,

  fallbackLink: {
    fontSize: 13,
    lineHeight: "1.6",
    color: colors.primary,
    textAlign: "center" as const,
    margin: "0 0 32px 0",
    wordBreak: "break-all" as const,
  } as React.CSSProperties,

  footer: {
    fontSize: 12,
    lineHeight: "1.5",
    color: colors.faint,
    textAlign: "center" as const,
    margin: 0,
  } as React.CSSProperties,
}
