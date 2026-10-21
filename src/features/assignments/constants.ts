export const statusLabels: Record<"draft" | "active" | "closed" | "finalized", string> = {
  draft: "รอเริ่มโหวต",
  active: "กำลังโหวต",
  closed: "สิ้นสุดแล้ว",
  finalized: "ปิดคะแนนแล้ว (Finalized)",
};

export const DEFAULT_QUESTIONS = [
  "ความถูกต้องและครบถ้วนของเนื้อหา",
  "ความคิดสร้างสรรค์ในการนำเสนอ",
  "การสื่อสารและการทำงานร่วมกัน",
];
