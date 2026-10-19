import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Geist } from "next/font/google";
import { Button, Card, } from "@heroui/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function CreateAssignment() {
  const router = useRouter();
  const [assignmentName, setAssignmentName] = useState("");
  const [classroom, setClassroom] = useState("Your Classroom");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("paireval_classroom");
      if (stored) {
        setClassroom(JSON.parse(stored).name);
      }
    }
  }, []);

  const handlePublish = () => {
    if (!assignmentName) {
      alert("Please enter an assignment name");
      return;
    }
    setIsGenerating(true);
    
    // Mock Pair Generation delay
    setTimeout(() => {
      setIsGenerating(false);
      localStorage.setItem("paireval_assignment", JSON.stringify({ name: assignmentName }));
      // Go to evaluate page for demo
      router.push("/evaluate");
    }, 1500);
  };

  return (
    <>
      <Head>
        <title>Create Assignment — PairEval</title>
      </Head>
      <div className={`${geistSans.className} min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100 p-8`}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
             <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">P</span>
             <h1 className="text-2xl font-bold">Step 2: Create Assignment</h1>
          </div>
          
          <div className="mb-4 text-sm text-zinc-500">
            Classroom: <span className="font-semibold">{classroom}</span>
          </div>

          <Card className="p-8 border border-black/12 shadow-sm dark:border-white/15 dark:bg-zinc-950 mb-6">
            <h2 className="text-xl font-semibold mb-4">Assignment Details</h2>
            <div className="mb-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Assignment Name <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Final Project Presentation" 
                  value={assignmentName}
                  onChange={(e) => setAssignmentName(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="mb-6">
               <div className="flex flex-col gap-2">
                 <label className="text-sm font-medium">Evaluation Criterion</label>
                 <input 
                   type="text"
                   className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-500 cursor-not-allowed"
                   defaultValue="User Experience"
                   readOnly
                 />
                 <span className="text-xs text-zinc-500">For this demo, we will use a single criterion as per M1 requirements.</span>
               </div>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg mb-6 border border-indigo-100 dark:border-indigo-800">
              <h3 className="font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Pairing Engine (Mock)</h3>
              <p className="text-sm text-indigo-700 dark:text-indigo-400">
                Clicking Publish will simulate the pairing algorithm, generating optimal pairs for the students uploaded in the previous step.
              </p>
            </div>
            
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <Button variant="ghost" onPress={() => router.back()}>Back</Button>
              <Button 
                variant="primary" 
                onPress={handlePublish}
                isDisabled={isGenerating}
              >
                {isGenerating ? "Generating Pairs..." : "Publish & Generate Pairs"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
