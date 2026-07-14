import type { Metadata } from "next";

// プライバシーポリシー。AdSense審査の必須要件。
// 広告開始・アナリティクス導入時はこのページの該当セクションを実態に合わせて更新すること。

export const metadata: Metadata = {
  title: "Privacy Policy — eMATCH BOARD",
};

export default function PrivacyPage() {
  return (
    <article className="prose-sm flex flex-col gap-4 text-sm leading-relaxed">
      <h1 className="text-lg font-bold">Privacy Policy</h1>
      <p className="text-xs text-muted">Last updated: July 14, 2026</p>

      <section>
        <h2 className="mb-1 font-semibold">Overview</h2>
        <p className="text-muted">
          eMATCH BOARD (&quot;we&quot;, &quot;this site&quot;) is an esports
          schedule and results website. We designed it to collect as little
          personal data as possible. You can use every feature without creating
          an account.
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Data stored in your browser</h2>
        <p className="text-muted">
          Your preferences — followed games, followed teams, language and
          display settings — are stored in your browser&apos;s localStorage.
          This data never leaves your device and is not transmitted to our
          servers. You can clear it at any time by clearing your browser data
          for this site.
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Server logs</h2>
        <p className="text-muted">
          Our hosting provider may collect standard technical logs (such as IP
          address, browser type and requested pages) for security and
          performance purposes.
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Analytics</h2>
        <p className="text-muted">
          We use Cloudflare Web Analytics to understand aggregate site usage
          (page views, referrers, countries). It is a privacy-first tool: it
          does not use cookies, does not fingerprint devices, and does not
          track you across sites. Only aggregated, non-personal statistics are
          available to us.
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Advertising</h2>
        <p className="text-muted">
          This site may display advertisements served by third-party ad
          networks such as Google AdSense. These providers may use cookies or
          similar technologies to serve ads based on your prior visits to this
          or other websites. You can opt out of personalized advertising by
          visiting{" "}
          <a
            href="https://www.google.com/settings/ads"
            className="underline hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Ads Settings
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Data sources</h2>
        <p className="text-muted">
          Match, tournament, team and player information is provided by
          PandaScore (Source: PandaScore). We do not sell or redistribute this
          data.
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Changes to this policy</h2>
        <p className="text-muted">
          We may update this policy as the site evolves (for example, when
          adding analytics or advertising). Changes will be posted on this
          page with an updated date.
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Contact</h2>
        <p className="text-muted">
          Questions about this policy: ematchboard@gmail.com
        </p>
      </section>
    </article>
  );
}
