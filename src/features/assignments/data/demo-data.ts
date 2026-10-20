import {
  demoTeacher,
  demoStudent,
  demoOtherStudent,
} from "@/features/auth/data/demo-users";
import type { Assignment } from "../types";
export { demoTeacher, demoStudent } from "@/features/auth/data/demo-users";
const baseQuestions = [
  "ความถูกต้องและครบถ้วนของเนื้อหา",
  "ความคิดสร้างสรรค์ในการนำเสนอ",
  "การสื่อสารและการทำงานร่วมกัน",
];
export function seed(): Assignment[] {
  return [
    "ออกแบบนวัตกรรมเพื่อชุมชน",
    "นำเสนอแนวคิดธุรกิจสร้างสรรค์",
    "โครงงานวิทยาศาสตร์รอบตัว",
    "การประเมินทักษะการทำงานเดี่ยวในทีม",
  ].map((title, i) => ({
    id: `demo-${i}`,
    ownerId: demoTeacher.id,
    title,
    description: [
      "ร่วมกันออกแบบแนวทางแก้ไขปัญหาใกล้ตัว และแลกเปลี่ยนความคิดเห็นผ่านการประเมินระหว่างกลุ่ม",
      "นำเสนอไอเดียธุรกิจที่ตอบโจทย์สังคม พร้อมรับข้อเสนอแนะจากเพื่อน",
      "เรียนรู้วิทยาศาสตร์ผ่านการลงมือทำ และประเมินผลงานอย่างสร้างสรรค์",
      "ประเมินเพื่อนต่างกลุ่มเป็นรายคน เพื่อสะท้อนจุดเด่นและสิ่งที่สามารถพัฒนาต่อยอดได้",
    ][i],
    subject: [
      "การออกแบบและเทคโนโลยี",
      "การงานอาชีพ",
      "วิทยาศาสตร์",
      "ทักษะชีวิตและการทำงาน",
    ][i],
    code: ["482619", "735204", "196832", "518294"][i],
    deadline: new Date(Date.now() + (7 + i) * 86400000).toISOString(),
    status: (["draft", "active", "closed", "draft"] as const)[i],
    evaluationMode: (i === 3 ? "individual" : "group") as "individual" | "group",
    questions: [...baseQuestions],
    students: [
      { id: demoStudent.id, name: demoStudent.name },
      { id: "s2", name: "ณัฐวุฒิ" },
      { id: demoOtherStudent.id, name: demoOtherStudent.name },
      { id: "s4", name: "ธนกร" },
    ],
    groups: [
      {
        id: "g1",
        name: "Creative Minds",
        members: [
          { id: demoStudent.id, name: demoStudent.name },
          { id: "s2", name: "ณัฐวุฒิ" },
        ],
      },
      {
        id: "g2",
        name: "The Next Gen",
        members: [
          { id: demoOtherStudent.id, name: demoOtherStudent.name },
          { id: "s4", name: "ธนกร" },
        ],
      },
    ],
    votes:
      i === 2
        ? [
            {
              userId: "s3",
              groupId: "g1",
              scores: [5, 4, 5],
              createdAt: new Date().toISOString(),
            },
            {
              userId: demoStudent.id,
              groupId: "g2",
              scores: [4, 5, 4],
              createdAt: new Date().toISOString(),
            },
          ]
        : [],
    createdAt: new Date().toISOString(),
    color: (["mint", "blue", "pink", "cream"] as const)[i % 4],
  }));
}
