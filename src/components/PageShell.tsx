import { Geist } from "next/font/google";
import Link from "next/link";
import { SignOutButton } from "#/features/auth/SignOutButton";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export function PageShell({
  children,
  maxWidth = "max-w-3xl",
  center = false,
}: {
  children: React.ReactNode;
  maxWidth?: string;
  center?: boolean;
}) {
  return (
    <div
      className={`${geistSans.className} relative isolate flex min-h-screen flex-col overflow-x-clip bg-[#f5fbf8] font-sans text-[#2d3c43]`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-60 -z-10 h-[600px] w-[550px] rotate-[-25deg] rounded-[130px] bg-[#e8f6fa]" />
      <header className="border-b border-emerald-900/10 bg-white/80">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6 sm:px-12" aria-label="Workspace">
          <Link href="/classrooms" className="font-serif text-3xl italic tracking-tight text-[#ee6069]">PairEval.</Link>
          <div className="flex items-center gap-6 text-sm text-emerald-800"><Link href="/classrooms" className="hover:underline">Classrooms</Link><SignOutButton /></div>
        </nav>
      </header>
      <main className={`workspace-content mx-auto flex w-full flex-1 ${maxWidth} flex-col gap-7 px-6 py-10 sm:py-14 ${center ? "justify-center" : ""}`}>{children}</main>
      <footer className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-3 border-t border-emerald-900/10 px-6 py-6 text-xs text-slate-500 sm:px-12"><span>PairEval.</span><span>A fresh perspective on student work.</span></footer>
    </div>
  );
}
