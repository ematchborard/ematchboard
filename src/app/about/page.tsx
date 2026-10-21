import type { Metadata } from "next";
import Link from "next/link";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = {
  title: "About — eMATCH BOARD",
};

export default function AboutPage() {
  return (
    <article className="flex flex-col gap-4 text-sm leading-relaxed">
      <h1 className="text-lg font-bold">About eMATCH BOARD</h1>

      <p className="text-muted">
        eMATCH BOARD is a fast, no-account-needed esports companion. See match
        schedules, live status, results, tournament brackets, standings and
        team rosters across {GAMES.length} games — all shown in your local
        timezone.
      </p>

      <section>
        <h2 className="mb-1 font-semibold">What you can do</h2>
        <ul className="list-inside list-disc text-muted">
          <li>Browse today&apos;s matches, or jump to any day, week or month</li>
          <li>Open a tournament to see its full schedule, bracket and standings</li>
          <li>Check team pages for rosters, recent form and upcoming matches</li>
          <li>Follow your favorite games and teams (saved in your browser)</li>
          <li>Pick your language to prioritize tournaments from your region</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Covered games</h2>
        <p className="text-muted">{GAMES.map((g) => g.name).join(" · ")}</p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Data</h2>
        <p className="text-muted">
          Esports data is provided by PandaScore (Source: PandaScore). Match
          times are converted to your device&apos;s timezone automatically.
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Trademarks</h2>
        <p className="text-muted">
          eMATCH BOARD is an unofficial, fan-made schedule aggregator and is
          not affiliated with, endorsed by, or sponsored by any game
          publisher or league. All game titles, team names and logos are
          trademarks of their respective owners, used here only to identify
          the games and tournaments covered. The Rocket League logo is used
          under{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            CC BY-SA 4.0
          </a>{" "}
          (© Psyonix, Inc., via Wikimedia Commons).
        </p>
      </section>

      <p className="text-muted">
        Questions or feedback: ematchboard@gmail.com ·{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
      </p>
    </article>
  );
}
