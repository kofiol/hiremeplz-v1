import Link from "next/link";

export default function PrivacyPage() {
  const effectiveDate = "2026-01-02";

  return (
    <div className="relative overflow-hidden pt-28 pb-24">
      <div className="absolute inset-0 -z-10 bg-primary/5 skew-y-3 transform origin-top-left scale-110" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-muted/40 via-background to-background" />

      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-balance">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Effective date: {effectiveDate}
          </p>
          <p className="mt-6 text-base md:text-lg text-muted-foreground">
            This Privacy Policy explains how HireMePlz (&quot;we&quot;,
            &quot;us&quot;, &quot;our&quot;) collects, uses, shares, and protects
            information when you visit our website (the &quot;Site&quot;), such
            as when you browse our landing page, join a waitlist, or contact us.
          </p>

          <div className="mt-10 space-y-10">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Information We Collect</h2>
              <p className="text-muted-foreground">
                We collect information you provide directly, information
                collected automatically when you use the Site, and
                information from third parties where applicable.
              </p>
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
                  <h3 className="font-medium">Information you provide</h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
                    <li>
                      Contact information (such as your email address) if you
                      join a waitlist, request updates, or contact us.
                    </li>
                    <li>
                      Information you include in messages or forms (such as
                      questions, feedback, or any details you choose to share).
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
                  <h3 className="font-medium">Information collected automatically</h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
                    <li>
                      Device and usage information (such as browser type, pages
                      viewed, referring/exit pages, and approximate location
                      derived from IP address).
                    </li>
                    <li>
                      Log and diagnostic information (such as timestamps and
                      basic error reports).
                    </li>
                    <li>
                      Cookies and similar technologies, which may be used to
                      remember preferences and measure performance.
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
                  <h3 className="font-medium">Information from third parties</h3>
                  <p className="mt-3 text-sm text-muted-foreground">
                    If you interact with us through third-party services (for
                    example, social platforms), we may receive information as
                    permitted by your settings and the third party&apos;s
                    policies.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">How We Use Information</h2>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>Provide, operate, and improve the Site.</li>
                <li>Respond to inquiries and communicate with you.</li>
                <li>Send updates you request (such as waitlist emails).</li>
                <li>Monitor, prevent, and address fraud, abuse, and errors.</li>
                <li>Comply with legal obligations and enforce our terms.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Legal Bases (EEA/UK)</h2>
              <p className="text-sm text-muted-foreground">
                If you are located in the EEA or UK, we process personal data
                only when we have a lawful basis, including: (a) performing a
                contract with you where applicable, (b) our legitimate
                interests (such as securing and improving the Site), (c) your
                consent (which you can withdraw), and (d) compliance with legal
                obligations.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">How We Share Information</h2>
              <p className="text-sm text-muted-foreground">
                We may share information in the following circumstances:
              </p>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>
                  With service providers who process information on our behalf
                  (for example, hosting, email delivery, and analytics).
                </li>
                <li>
                  With professional advisors (such as lawyers or accountants)
                  where necessary.
                </li>
                <li>
                  For legal reasons, such as to comply with law or protect the
                  rights, safety, and security of our users and the Site.
                </li>
                <li>
                  In connection with a merger, acquisition, financing, or sale
                  of assets, subject to appropriate safeguards.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Cookies and Similar Technologies</h2>
              <p className="text-sm text-muted-foreground">
                We use cookies and similar technologies to provide core
                functionality, remember preferences, and understand how the
                Site is used. You can control cookies through your browser
                settings. Disabling cookies may affect certain features.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Data Retention</h2>
              <p className="text-sm text-muted-foreground">
                We retain information for as long as necessary to operate the
                Site, communicate with you (for example, about the waitlist),
                comply with legal obligations, resolve disputes, and enforce
                our agreements. Retention periods may vary depending on the
                type of information and the purpose of processing.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Security</h2>
              <p className="text-sm text-muted-foreground">
                We implement reasonable administrative, technical, and physical
                safeguards designed to protect information. No method of
                transmission or storage is completely secure, so we cannot
                guarantee absolute security.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">International Transfers</h2>
              <p className="text-sm text-muted-foreground">
                Your information may be processed in countries other than where
                you live. Where required, we rely on appropriate safeguards for
                cross-border transfers, such as contractual protections.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Your Rights and Choices</h2>
              <p className="text-sm text-muted-foreground">
                Depending on your location, you may have rights regarding your
                personal data, such as access, correction, deletion, portability,
                and objection or restriction to certain processing. You may also
                have the right to withdraw consent where processing is based on
                consent.
              </p>
              <p className="text-sm text-muted-foreground">
                If you are in the EEA or UK, you may also have the right to lodge
                a complaint with your local data protection authority.
              </p>
              <p className="text-sm text-muted-foreground">
                To exercise applicable rights, contact us using the details
                below. We may need to verify your identity before responding.
              </p>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
                <h3 className="font-medium">California notice</h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  Some privacy laws define &quot;sale&quot; or &quot;sharing&quot;
                  broadly. To the extent our disclosures could be considered a
                  sale or sharing under applicable law, you may request to opt
                  out by contacting us. We do not knowingly collect personal
                  information from children under 13.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Children&apos;s Privacy</h2>
              <p className="text-sm text-muted-foreground">
                The Site is not directed to children under 13 (or another age
                as required by local law). If you believe a child has provided
                personal information to us, contact us so we can take
                appropriate steps.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Changes to This Policy</h2>
              <p className="text-sm text-muted-foreground">
                We may update this Privacy Policy from time to time. We will
                post the updated version and update the effective date. If
                changes are material, we may provide additional notice as
                required by law.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Contact Us</h2>
              <p className="text-sm text-muted-foreground">
                If you have questions or requests about this Privacy Policy,
                contact us at{" "}
                <a
                  href="mailto:privacy@hiremeplz.app"
                  className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                >
                  privacy@hiremeplz.app
                </a>
                .
              </p>
              <p className="text-sm text-muted-foreground">
                You can also return to the{" "}
                <Link
                  href="/"
                  className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                >
                  home page
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
