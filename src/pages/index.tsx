import Head from "next/head";
import Link from "next/link";
import { Button } from "@heroui/react";
import { useEffect, useState } from "react";

const steps = [
  { number: "01", title: "For teachers", text: "Create an assignment. Give every group a place to share their work.", color: "#dff3e9", ink: "#25785e" },
  { number: "02", title: "For students", text: "Find your classroom, choose your group, and add your submission.", color: "#def1f8", ink: "#267b92" },
  { number: "03", title: "A fresh perspective", text: "Compare two other groups side by side. Choose the stronger work.", color: "#fde4e5", ink: "#bc4960" },
  { number: "04", title: "Thoughtful insights", text: "Results stay with your teacher, helping them make informed assessments.", color: "#fff1cf", ink: "#9a721c" },
];

function LearningIllustration({ color, index = 0 }: { color: string; index?: number }) {
  return <svg viewBox="0 0 260 190" fill="none" aria-hidden="true" className="w-full">
    <path d="M-12 188C-2 73 94 65 130 87c46-64 130-40 142 101H-12Z" fill={color} />
    <path d="M84 182c-11-33 6-66 29-70 29-8 53 18 64 70" fill={["#58bb94", "#62bbd4", "#f57e87", "#efbd4c"][index]} stroke="#58334e" strokeWidth="2" />
    <path d="M117 108V91h21v25c-3 11-16 9-21-8Z" fill="#fff6ef" stroke="#58334e" strokeWidth="2" />
    <path d="M108 70c0-27 46-30 49-5 3 26-10 42-24 40-15-2-26-18-25-35Z" fill="#fff6ef" stroke="#58334e" strokeWidth="2" />
    <path d="M107 81c-13-21-4-48 19-45 14-14 41 0 36 18-5 13-20 17-32 10-3 15-12 20-23 17Z" fill="#702749" />
    <path d="m137 79 6 4-5 3m-6 7c5 3 9 2 12-1" stroke="#702749" strokeWidth="2" strokeLinecap="round" />
    <circle cx="130" cy="79" r="2" fill="#702749" />
    <path d="m152 139 29 36m-83-30-9 30" stroke="#58334e" strokeWidth="2" strokeLinecap="round" />
    <path d="M46 137h78l17 45H63l-17-45Z" fill="white" stroke="#58334e" strokeWidth="2" />
    <circle cx="92" cy="160" r="6" stroke="#58334e" strokeWidth="1.5" />
    <path d="M52 183h146" stroke="#58334e" strokeWidth="2" strokeLinecap="round" />
    <rect x="180" y="51" width="35" height="35" rx="11" fill="white" />
    <path d="m189 68 6 6 11-12" stroke="#4f9c80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export default function Home() {
  // The landing page is static, so ask the session endpoint once it loads.
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    fetch("/api/account").then((response) => setSignedIn(response.ok)).catch(() => {});
  }, []);
  return <>
    <Head>
      <title>PairEval — A fresh perspective on student work</title>
      <meta name="description" content="Create assignments, work in groups, and make thoughtful pairwise comparisons with PairEval." />
    </Head>
    <div className="relative isolate min-h-screen overflow-hidden bg-white font-sans text-[#2d3c43]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-64 -top-72 -z-10 h-[780px] w-[680px] rotate-[-25deg] rounded-[160px] bg-[#e8f6fa]" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-80 top-[620px] -z-10 h-[650px] w-[470px] rotate-[30deg] rounded-[120px] bg-[#fff5db]" />
      <header className="mx-auto max-w-6xl px-6 pt-8 sm:px-12 sm:pt-12">
        <nav data-testid="nav" aria-label="Main" className="flex items-center justify-between gap-6">
          <a href="#home" className="font-serif text-3xl italic tracking-tight text-[#ee6069]">PairEval.</a>
          {signedIn ? <Link href="/classrooms" className="rounded-md bg-[#3dbb94] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700">Your classrooms →</Link>
            : <div className="flex items-center gap-4">
            <Link href="/sign-up" className="hidden rounded-md bg-[#ef636b] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#dd535c] sm:inline-block">Create account</Link>
            <Link href="/sign-in"><Button variant="ghost" size="sm">Sign in</Button></Link>
          </div>}
        </nav>
      </header>
      <main id="home" className="mx-auto max-w-6xl px-6 sm:px-12">
        <section className="mx-auto flex max-w-3xl flex-col items-center pb-16 pt-20 text-center sm:pt-24">
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-700">University Evaluation System</p>
          <h1 className="font-serif text-4xl leading-[1.15] tracking-tight sm:text-6xl">Fairer student evaluation through pairwise comparison</h1>
          <p className="mt-6 max-w-lg text-sm leading-7 text-slate-500 sm:text-base">Great work deserves a fresh perspective. Bring your class together to share, compare, and learn from each other.</p>
          <Link data-testid="main-cta" href="/sign-up" className="mt-8 inline-flex items-center gap-5 rounded-md bg-[#3dbb94] px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-700">Start learning together <span aria-hidden="true">↗</span></Link>
        </section>
        <section id="how-it-works" aria-labelledby="journey-title" className="scroll-mt-8 pb-24">
          <h2 id="journey-title" className="mb-7 text-center text-xs uppercase tracking-[0.2em] text-slate-500">One classroom. Many perspectives.</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => <article key={step.number} className="group overflow-hidden rounded-sm border border-slate-100 bg-white pt-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-100">
              <div className="px-5"><span className="text-[10px] tracking-widest text-slate-400">{step.number} /</span>
                <h3 className="mb-4 mt-2 text-sm font-semibold" style={{ color: step.ink }}>{step.title}</h3></div>
              <LearningIllustration color={step.color} index={index} />
              <p className="min-h-28 px-5 py-5 text-xs leading-6 text-slate-500">{step.text}</p>
            </article>)}
          </div>
        </section>
        <section id="about" className="grid items-center gap-12 pb-24 md:grid-cols-2 md:gap-20">
          <div><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Made for your classroom</p>
            <h2 className="font-serif text-4xl leading-tight">Less guesswork.<br />More understanding.</h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-500">Teachers set the assignment and guide the process. Students choose a group and compare work from other teams. Teachers alone can view the results.</p>
            <Link href="/sign-up" className="mt-7 inline-flex items-center gap-5 text-sm font-medium text-emerald-700">Find your perspective <span aria-hidden="true">→</span></Link>
          </div>
          <div className="mx-auto w-full max-w-sm"><LearningIllustration color="#e0f4eb" /></div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-6xl flex-col justify-between gap-3 border-t border-slate-100 px-6 py-7 text-xs text-slate-400 sm:flex-row sm:px-12">
        <span className="font-serif text-lg italic text-[#ee6069]">PairEval.</span><p>Thoughtful comparisons. Shared learning.</p><Link href="/sign-in">Your classroom →</Link>
      </footer>
    </div>
  </>;
}
