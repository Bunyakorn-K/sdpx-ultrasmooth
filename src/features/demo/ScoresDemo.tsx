import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { Geist } from "next/font/google";
import { Button, Card, Chip } from "@heroui/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function Scores() {
  const [classroom, setClassroom] = useState("Your Classroom");
  const [assignment, setAssignment] = useState("Your Assignment");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cls = localStorage.getItem("paireval_classroom");
      const asn = localStorage.getItem("paireval_assignment");
      if (cls) setClassroom(JSON.parse(cls).name);
      if (asn) setAssignment(JSON.parse(asn).name);
    }
  }, []);

  const mockScores = [
    { rank: 1, name: "กลุ่ม Aurora", score: 9.4 },
    { rank: 2, name: "กลุ่ม Borealis", score: 8.7 },
    { rank: 3, name: "กลุ่ม Draco", score: 7.2 },
    { rank: 4, name: "กลุ่ม Corona", score: 6.5 },
  ];

  return (
    <>
      <Head>
        <title>Scores — PairEval</title>
      </Head>
      <div className={`${geistSans.className} min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100 p-8`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">P</span>
              <h1 className="text-2xl font-bold">Step 3: Evaluation Results</h1>
            </div>
            <Link href="/">
              <Button variant="ghost">Back to Home</Button>
            </Link>
          </div>

          <div className="mb-6 flex gap-4">
            <Chip variant="soft" color="accent">Classroom: {classroom}</Chip>
            <Chip variant="soft" color="default">Assignment: {assignment}</Chip>
          </div>

          <Card className="p-0 border border-black/12 shadow-sm dark:border-white/15 dark:bg-zinc-950 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-900 border-b border-black/10 dark:border-white/10">
                  <th className="p-4 font-semibold">Rank</th>
                  <th className="p-4 font-semibold">Group / Student</th>
                  <th className="p-4 font-semibold">Mock Score</th>
                  <th className="p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockScores.map((item, idx) => (
                  <tr key={idx} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="p-4 font-medium">{item.rank}</td>
                    <td className="p-4">{item.name}</td>
                    <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400">{item.score.toFixed(1)} / 10</td>
                    <td className="p-4"><Chip size="sm" color="success" variant="soft">Evaluated</Chip></td>
                  </tr>
                ))}
              
              </tbody>
            </table>
            
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900 text-sm text-zinc-600 dark:text-zinc-400 border-t border-black/10 dark:border-white/10">
              <p><strong>Note:</strong> These are mock scores for the M1 Walking Skeleton demo. The real scoring engine will calculate Bradley-Terry/Quality indexes based on the pairwise comparisons.</p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
