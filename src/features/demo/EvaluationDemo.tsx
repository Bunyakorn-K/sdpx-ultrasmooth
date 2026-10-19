import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Geist } from "next/font/google";
import { Button, Card } from "@heroui/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

type ComparisonResult = {
  id: string;
  choice: number | null;
};

const MOCK_CRITERIA = [
  {
    id: "c1",
    name: "User Experience",
    pairs: [
      {
        id: "p1",
        itemLeft: { name: "กลุ่ม Aurora", link: "#" },
        itemRight: { name: "กลุ่ม Borealis", link: "#" }
      },
      {
        id: "p2",
        itemLeft: { name: "กลุ่ม Corona", link: "#" },
        itemRight: { name: "กลุ่ม Draco", link: "#" }
      }
    ]
  }
];

export default function EvaluateWorkspace() {
  const router = useRouter();
  const [results, setResults] = useState<Record<string, number | null>>({});
  const [saveStatus, setSaveStatus] = useState<string>("");
  
  const totalQuestions = MOCK_CRITERIA.reduce((acc, c) => acc + c.pairs.length, 0);
  const answeredQuestions = Object.values(results).filter(v => v !== null).length;
  const progressPercent = (answeredQuestions / totalQuestions) * 100;

  const handleSelect = (pairId: string, value: number) => {
    setResults(prev => ({ ...prev, [pairId]: value }));
    setSaveStatus("กำลังบันทึก...");
    
    // Mock autosave
    setTimeout(() => {
      const now = new Date();
      setSaveStatus(`บันทึกแล้ว เมื่อ ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    }, 1000);
  };

  const handleSubmit = () => {
    if (answeredQuestions < totalQuestions) {
      alert(`คุณตอบไปเพียง ${answeredQuestions} จาก ${totalQuestions} ข้อ ยืนยันที่จะ Submit หรือไม่?`);
    } else {
      alert("Submit สำเร็จ!");
      router.push("/scores");
    }
  };

  return (
    <>
      <Head>
        <title>Workspace — PairEval</title>
      </Head>
      <div className={`${geistSans.className} min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100 pb-20`}>
        <header className="sticky top-0 z-10 border-b border-black/8 bg-zinc-50/80 backdrop-blur px-6 py-4 dark:border-white/12 dark:bg-black/80 flex items-center justify-between">
          <Link href="/" className="font-semibold flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">P</span>
            PairEval
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium">
            <span aria-live="polite" className="text-zinc-500">{saveStatus}</span>
            <span className="text-zinc-700 dark:text-zinc-300">
              {answeredQuestions} / {totalQuestions} ✓
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 mt-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Group Evaluation</h1>
            <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} /></div>
          </div>

          {MOCK_CRITERIA.map(criterion => (
            <section key={criterion.id} className="mb-12">
              <h2 className="text-xl font-semibold mb-4 px-2">{criterion.name}</h2>
              <div className="flex flex-col gap-6">
                {criterion.pairs.map(pair => (
                  <Card key={pair.id} className="p-6 border border-black/12 shadow-sm dark:border-white/15 dark:bg-zinc-950">
                    <div className="flex justify-between items-center mb-6">
                      <div className="text-center w-1/3">
                        <h3 className="font-medium text-lg">{pair.itemLeft.name}</h3>
                        <a href={pair.itemLeft.link} target="_blank" className="text-sm text-indigo-600 hover:underline">ดูผลงาน ↗</a>
                      </div>
                      <div className="text-center w-1/3 text-zinc-400">VS</div>
                      <div className="text-center w-1/3">
                        <h3 className="font-medium text-lg">{pair.itemRight.name}</h3>
                        <a href={pair.itemRight.link} target="_blank" className="text-sm text-indigo-600 hover:underline">ดูผลงาน ↗</a>
                      </div>
                    </div>
                    
                    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4" role="radiogroup" aria-labelledby={`rg-${pair.id}`}>
                      <div id={`rg-${pair.id}`} className="sr-only">Choose which group is better for {criterion.name}</div>
                      
                      {/* The 6-point scale UI */}
                      <div className="flex flex-col sm:flex-row justify-between gap-2 mt-2">
                        {[
                          { val: 1, label: "ซ้ายดีกว่ามาก" },
                          { val: 2, label: "ซ้ายดีกว่า" },
                          { val: 3, label: "ซ้ายดีกว่าเล็กน้อย" },
                          { val: 4, label: "ขวาดีกว่าเล็กน้อย" },
                          { val: 5, label: "ขวาดีกว่า" },
                          { val: 6, label: "ขวาดีกว่ามาก" },
                        ].map(opt => (
                          <label 
                            key={opt.val}
                            className={`flex flex-col items-center p-3 rounded-md cursor-pointer transition-colors border-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-1 text-center ${
                              results[pair.id] === opt.val 
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' 
                                : 'border-transparent text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            <input 
                              type="radio" 
                              name={`pair-${pair.id}`} 
                              value={opt.val} 
                              checked={results[pair.id] === opt.val}
                              onChange={() => handleSelect(pair.id, opt.val)}
                              className="sr-only" 
                            />
                            <span className="font-bold text-lg mb-1">{opt.val}</span>
                            <span className="text-xs leading-tight">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}

          <div className="flex justify-end mt-8 border-t border-black/10 dark:border-white/10 pt-6">
            <Button variant="primary" size="lg" onPress={handleSubmit} data-testid="submit-evaluation">
              Submit Evaluation
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}
