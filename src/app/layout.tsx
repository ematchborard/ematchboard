import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import GameSidebar from "@/components/GameSidebar";
import GameTabs from "@/components/GameTabs";
import LanguageSelect from "@/components/LanguageSelect";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://ematchboard.com"),
  title: "eMATCH BOARD — Esports Schedules & Results",
  description:
    "Match schedules, live status and results for VALORANT, League of Legends, CS2 and more esports — tournaments, brackets and rosters in your local timezone.",
  openGraph: {
    title: "eMATCH BOARD — Esports Schedules & Results",
    description:
      "All esports schedules in one place. VALORANT, LoL, CS2, Dota 2 and more — in your local timezone.",
    siteName: "eMATCH BOARD",
    type: "website",
  },
  verification: {
    google: "5XCLyjKuD-EoH4Q1N4um_HDpPa5obmnduKGMAzHOiko",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* ライトモード選択済みのユーザーで、描画前にテーマを適用(チラつき防止) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("esports-mob:theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}`,
          }}
        />
        <header className="sticky top-0 z-10 border-b border-border-subtle bg-background/90 backdrop-blur">
          <div className="mx-auto w-full max-w-5xl px-4 pt-4 pb-3 md:pb-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-lg font-bold tracking-tight">
                <span className="text-brand">e</span>MATCH BOARD
              </Link>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <LanguageSelect />
              </div>
            </div>
            {/* スマホ幅ではサイドバーの代わりにタブでゲーム切替 */}
            <div className="md:hidden">
              <GameTabs />
            </div>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-5xl flex-1 items-start gap-6 px-4 py-6">
          <aside className="hidden w-56 shrink-0 md:block">
            <GameSidebar />
          </aside>
          <main className="min-w-0 max-w-2xl flex-1">{children}</main>
        </div>
        <footer className="mx-auto w-full max-w-5xl px-4 pb-6 text-center text-xs text-muted">
          <p>Source: PandaScore · All times shown in your local timezone</p>
          <p className="mt-1.5 flex justify-center gap-3">
            <Link href="/about" className="hover:text-foreground">
              About
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
