import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Geist } from "next/font/google";
import { Button, Card, } from "@heroui/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function CreateClassroom() {
  const router = useRouter();
  const [className, setClassName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleNext = () => {
    if (!className) {
      alert("Please enter a classroom name");
      return;
    }
    // Save to mock state
    if (typeof window !== "undefined") {
      localStorage.setItem("paireval_classroom", JSON.stringify({ name: className, hasRoster: !!file }));
      router.push("/assignments/new");
    }
  };

  return (
    <>
      <Head>
        <title>Create Classroom — PairEval</title>
      </Head>
      <div className={`${geistSans.className} min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100 p-8`}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
             <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">P</span>
             <h1 className="text-2xl font-bold">Step 1: Setup Classroom & Roster</h1>
          </div>

          <Card className="p-8 border border-black/12 shadow-sm dark:border-white/15 dark:bg-zinc-950 mb-6">
            <h2 className="text-xl font-semibold mb-4">Classroom Details</h2>
            <div className="mb-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Classroom Name <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 2110336 Software Engineering" 
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                />
              </div>
            </div>

            <h2 className="text-xl font-semibold mb-4 mt-8">Import Students (CSV)</h2>
            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-10 text-center mb-4">
              <input 
                type="file" 
                accept=".csv" 
                id="csv-upload" 
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                <span className="text-4xl mb-2">📁</span>
                <span className="text-indigo-600 font-medium hover:underline">Click to upload CSV</span>
                <span className="text-sm text-zinc-500 mt-1">Required columns: email, group_name</span>
                {file && <span className="mt-4 text-green-600 font-medium">Selected: {file.name}</span>}
              </label>
            </div>
            
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <Button variant="ghost" onPress={() => router.push("/")}>Cancel</Button>
              <Button variant="primary" onPress={handleNext}>Continue to Assignment</Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
