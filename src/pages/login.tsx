import Head from "next/head";
import { useRouter } from "next/router";
import { Geist } from "next/font/google";
import { Button, Card } from "@heroui/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function Login() {
  const router = useRouter();

  const handleMockLogin = () => {
    // In a real app, this would be handled by Auth Provider
    if (typeof window !== "undefined") {
      localStorage.setItem("paireval_user", JSON.stringify({ role: "instructor", name: "Aj. Somchai" }));
      router.push("/classroom/new");
    }
  };

  return (
    <>
      <Head>
        <title>Login — PairEval</title>
      </Head>
      <div className={`${geistSans.className} min-h-screen flex items-center justify-center bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100 p-4`}>
        <Card className="max-w-md w-full p-8 border border-black/12 shadow-sm dark:border-white/15 dark:bg-zinc-950 text-center">
          <div className="flex justify-center mb-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 text-2xl font-bold text-white">
              P
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Sign in to PairEval</h1>
          <p className="text-zinc-500 mb-8">Demo Mode: No password required</p>
          
          <Button 
            variant="primary" 
            size="lg" 
            className="w-full"
            onPress={handleMockLogin}
          >
            Sign in as Instructor (Demo)
          </Button>
          
          <p className="mt-6 text-sm text-zinc-400">
            For this M1 Walking Skeleton demo, clicking the button will log you in as an Instructor and redirect you to create a classroom.
          </p>
        </Card>
      </div>
    </>
  );
}
