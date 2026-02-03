/**
 * Send launch announcement emails to waitlist
 *
 * Usage:
 *   pnpm send-launch                            # Dry run (preview only)
 *   pnpm send-launch --send                     # Send immediately
 *   pnpm send-launch --send --at "2024-02-04 10:00"  # Schedule for later (UTC)
 *
 * Make sure to:
 * 1. Add your waitlist emails to scripts/waitlist.json
 * 2. Set RESEND_API_KEY in your .env.local
 */

import { config } from "dotenv"
import { Resend } from "resend"
import { render } from "@react-email/components"
import LaunchAnnouncement from "../src/emails/launch-announcement"
import * as fs from "fs"
import * as path from "path"

// Load .env.local
config({ path: path.join(__dirname, "../.env.local") })

interface WaitlistEntry {
  email: string
  name?: string
}

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = "HireMePlz <noreply@hiremeplz.app>"
const SUBJECT = "HireMePlz is live — you're in"

function parseScheduleTime(args: string[]): Date | null {
  const atIndex = args.indexOf("--at")
  if (atIndex === -1 || !args[atIndex + 1]) return null

  const dateStr = args[atIndex + 1]
  const date = new Date(dateStr)

  if (isNaN(date.getTime())) {
    console.error(`Invalid date format: ${dateStr}`)
    console.error('Use format: "YYYY-MM-DD HH:MM" (in UTC)')
    process.exit(1)
  }

  return date
}

async function main() {
  const args = process.argv.slice(2)
  const shouldSend = args.includes("--send")
  const scheduledAt = parseScheduleTime(args)

  // Load waitlist
  const waitlistPath = path.join(__dirname, "waitlist.json")
  if (!fs.existsSync(waitlistPath)) {
    console.error("Error: waitlist.json not found")
    console.error("Create scripts/waitlist.json with your waitlist emails")
    process.exit(1)
  }

  const waitlist: WaitlistEntry[] = JSON.parse(
    fs.readFileSync(waitlistPath, "utf-8")
  )

  console.log(`\n📋 Found ${waitlist.length} emails in waitlist\n`)

  if (!shouldSend) {
    console.log("🔍 DRY RUN MODE (use --send to actually send)\n")
    console.log("Would send to:")
    waitlist.forEach((entry, i) => {
      console.log(`  ${i + 1}. ${entry.email}${entry.name ? ` (${entry.name})` : ""}`)
    })

    // Preview HTML
    const previewHtml = await render(LaunchAnnouncement({ userName: "there" }))
    const previewPath = path.join(__dirname, "preview-launch-email.html")
    fs.writeFileSync(previewPath, previewHtml)
    console.log(`\n📧 Preview saved to: ${previewPath}`)
    console.log("   Open this file in your browser to preview the email\n")
    console.log("💡 To schedule: pnpm send-launch --send --at \"2024-02-04 10:00\"")
    console.log("   (Time is in UTC)\n")
    return
  }

  // Validate API key
  if (!RESEND_API_KEY) {
    console.error("Error: RESEND_API_KEY not set in environment")
    console.error("Add it to your .env.local file")
    process.exit(1)
  }

  const resend = new Resend(RESEND_API_KEY)

  if (scheduledAt) {
    console.log(`⏰ SCHEDULING EMAILS for ${scheduledAt.toISOString()}\n`)
  } else {
    console.log("📨 SENDING EMAILS NOW...\n")
  }

  let sent = 0
  let failed = 0

  for (const entry of waitlist) {
    const userName = entry.name || "there"

    try {
      const html = await render(LaunchAnnouncement({ userName }))

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: entry.email,
        subject: SUBJECT,
        html,
        ...(scheduledAt && { scheduledAt: scheduledAt.toISOString() }),
      })

      if (error) {
        console.error(`❌ ${entry.email}: ${error.message}`)
        failed++
      } else {
        const action = scheduledAt ? "scheduled" : "sent"
        console.log(`✅ ${entry.email} (${action})`)
        sent++
      }

      // Delay between API calls (Resend allows 2 req/sec)
      await new Promise((resolve) => setTimeout(resolve, 600))
    } catch (err) {
      console.error(`❌ ${entry.email}: ${err}`)
      failed++
    }
  }

  const action = scheduledAt ? "scheduled" : "sent"
  console.log(`\n📊 Results: ${sent} ${action}, ${failed} failed`)

  if (scheduledAt) {
    console.log(`\n🕐 Emails will be delivered at: ${scheduledAt.toISOString()}`)
    console.log("   You can close this terminal now.\n")
  }
}

main().catch(console.error)
