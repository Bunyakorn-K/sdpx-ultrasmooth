import type { Metadata } from "next";
import "./globals.css";
import { WorkspaceProvider } from "@/features/workspace/context/workspace-provider";

export const metadata: Metadata = {
  title: "Pairwise (Peerly) — ทุกความคิดเห็น สร้างการเรียนรู้ที่ดีกว่า",
  description:
    "พื้นที่ประเมินผลงานระหว่างกลุ่มสำหรับครูและนักเรียน สร้าง assignment รวมทีม โหวต 5 ระดับ และสรุปผลในที่เดียว",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" data-scroll-behavior="smooth">
      <body>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </body>
    </html>
  );
}
