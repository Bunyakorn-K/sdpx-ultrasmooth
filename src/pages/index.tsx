import Head from "next/head";
import { Geist } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const navItems = [
  { label: "Home", href: "#home" },
  { label: "How it works", href: "#how-it-works" },
  { label: "About", href: "#about" },
];

export default function Home() {
  return (
    <>
      <Head>
        <title>PairEval — Pairwise Student Evaluation</title>
        <meta
          name="description"
          content="PairEval is a university evaluation system based on pairwise comparison."
        />
      </Head>

      <div
        className={`${geistSans.className} flex min-h-screen flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100`}
      >
        {/* Navigation bar */}
        <header className="sticky top-0 z-10 border-b border-black/8 bg-zinc-50/80 backdrop-blur dark:border-white/12 dark:bg-black/80">
          <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
            <a href="#home" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
                P
              </span>
              PairEval
            </a>

            <ul className="hidden items-center gap-8 text-sm text-zinc-600 dark:text-zinc-400 sm:flex">
              {navItems.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>

            <a
              href="#"
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Sign in
            </a>
          </nav>
        </header>

        {/* Main content */}
        <main id="home" className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6">
          {/* Hero */}
          <section className="flex flex-col items-center gap-5 pt-24 pb-16 text-center">
            <span className="rounded-full border border-black/8 px-3 py-1 text-xs font-medium text-zinc-500 dark:border-white/12 dark:text-zinc-400">
              University Evaluation System
            </span>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-yellow-700 dark:text-yellow-400 sm:text-5xl">
              Fairer student evaluation through pairwise comparison
            </h1>
            <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              PairEval turns simple “which is better?” comparisons into reliable,
              consistent rankings — making assessment faster and more objective.
            </p>
          </section>

          {/* Main feature placeholder */}
          <section
            id="how-it-works"
            className="mb-24 rounded-2xl border border-dashed border-black/12 bg-white p-10 dark:border-white/15 dark:bg-zinc-950"
          >
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-900">
                {/* simple placeholder glyph */}
                <span className="text-2xl">⧉</span>
              </div>
              <h2 className="text-xl font-medium">Pairwise comparison workspace</h2>
              <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
                The main feature will live here. Reviewers will be shown two
                submissions side by side and choose the stronger one.
              </p>
              <span className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                Coming soon
              </span>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer
          id="about"
          className="border-t border-black/8 dark:border-white/12"
        >
          <div className="mx-auto w-full max-w-5xl px-6 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            © {new Date().getFullYear()} PairEval — Pairwise student evaluation.
          </div>
        </footer>
      </div>
    </>
  );
}
