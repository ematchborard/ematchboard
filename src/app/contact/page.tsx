import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact — eMATCH BOARD",
};

export default function ContactPage() {
  return (
    <article className="flex flex-col gap-4 text-sm leading-relaxed">
      <h1 className="text-lg font-bold">Contact</h1>

      <p className="text-muted">
        Questions, feedback, bug reports, or a tournament we should add?
        Reach out at{" "}
        <a
          href="mailto:ematchboard@gmail.com"
          className="underline hover:text-foreground"
        >
          ematchboard@gmail.com
        </a>
        .
      </p>

      <p className="text-muted">
        For data corrections (wrong schedule, missing match, incorrect team
        info), please include the game and a link to the affected page so we
        can look into it quickly.
      </p>

      <p className="text-muted">
        See also:{" "}
        <Link href="/about" className="underline hover:text-foreground">
          About
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
      </p>
    </article>
  );
}
