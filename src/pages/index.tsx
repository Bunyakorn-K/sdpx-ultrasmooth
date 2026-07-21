import { useEffect, useRef } from "react";
import Head from "next/head";
import { Geist } from "next/font/google";
import { Button, Card, Chip } from "@heroui/react";
import { animate, stagger, createScope, type Scope } from "animejs";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<Scope | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    scopeRef.current = createScope({ root: rootRef }).add(() => {
      if (prefersReduced) {
        // Respect reduced-motion: reveal instantly, no motion.
        animate(".reveal", { opacity: 1, duration: 0 });
        return;
      }

      // Staggered entrance for the hero + feature card.
      animate(".reveal", {
        opacity: [0, 1],
        translateY: [24, 0],
        delay: stagger(90, { start: 120 }),
        duration: 800,
        ease: "out(3)",
      });

      // Gentle continuous float on the placeholder glyph.
      animate(".float-glyph", {
        translateY: [-6, 6],
        duration: 2600,
        ease: "inOut(2)",
        loop: true,
        alternate: true,
      });
    });

    return () => scopeRef.current?.revert();
  }, []);

  return (
    <>
      <Head>
        <title>PairEval — Pairwise Student Evaluation</title>
        <meta
          name="description"
          content="PairEval is a university evaluation system based on pairwise comparison."
        />
      </Head>

      {/* Keep content visible if JavaScript is unavailable. */}
      <noscript>
        <style>{`.reveal{opacity:1 !important}`}</style>
      </noscript>

      <div
        ref={rootRef}
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

            <Button variant="primary" size="sm">
              Sign in
            </Button>
          </nav>
        </header>

        {/* Main content */}
        <main id="home" className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6">
          {/* Hero */}
          <section className="flex flex-col items-center gap-5 pt-24 pb-16 text-center">
            <Chip className="reveal" variant="soft" size="sm">
              University Evaluation System
            </Chip>
            <h1 className="reveal max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Fairer student evaluation through pairwise comparison
            </h1>
            <p className="reveal max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              PairEval turns simple “which is better?” comparisons into reliable,
              consistent rankings — making assessment faster and more objective.
            </p>
            <div className="reveal mt-2 flex flex-col gap-3 sm:flex-row">
              <Button variant="primary">Get started</Button>
              <Button variant="outline">See how it works</Button>
            </div>
          </section>

          {/* Main feature placeholder */}
          <Card
            id="how-it-works"
            className="reveal mb-24 border border-dashed border-black/12 bg-white dark:border-white/15 dark:bg-zinc-950"
          >
            <Card.Header className="items-center text-center">
              <div className="float-glyph mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-2xl text-zinc-400 dark:bg-zinc-900">
                ⧉
              </div>
              <Card.Title>Pairwise comparison workspace</Card.Title>
              <Card.Description className="max-w-md">
                The main feature will live here. Reviewers will be shown two
                submissions side by side and choose the stronger one.
              </Card.Description>
            </Card.Header>
            <Card.Content className="flex justify-center pb-8">
              <Chip color="default" variant="soft" size="sm">
                Coming soon
              </Chip>
            </Card.Content>
          </Card>
        </main>

        {/* Footer */}
        <footer id="about" className="border-t border-black/8 dark:border-white/12">
          <div className="mx-auto w-full max-w-5xl px-6 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            © {new Date().getFullYear()} PairEval — Pairwise student evaluation.
          </div>
        </footer>
      </div>
    </>
  );
}
