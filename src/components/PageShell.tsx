import { Geist } from "next/font/google";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

// Full-bleed background (matches the homepage's bg-zinc-50/dark:bg-black)
// with a centered, max-width content column — kept as one shared shell so
// every new page's background actually spans the viewport instead of being
// boxed in by the same max-width as its content.
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
      className={`${geistSans.className} flex min-h-screen ${center ? "items-center" : ""} bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100`}
    >
      <div className={`mx-auto flex w-full ${maxWidth} flex-col gap-6 px-6 py-12 sm:py-16`}>{children}</div>
    </div>
  );
}
