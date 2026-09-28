import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
// เปลี่ยนชื่อจาก booking_latency เป็น classroom_latency ให้ตรงบริบทของโปรเจกต์
const classroomLatency = new Trend("classroom_latency", true);

export const options = {
  stages: [
    { duration: "30s", target: 5 }, // ramp up
    { duration: "1m", target: 10 }, // steady state
    { duration: "30s", target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
    errors: ["rate<0.05"],
    classroom_latency: ["p(95)<300"],
    // เจาะจงราย endpoint ด้วย tag `name:list`
    "http_req_duration{name:list}": ["p(95)<300"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// ฟังก์ชัน setup() จะทำงานครั้งเดียวก่อนเริ่ม load test เอาไว้ทำ Mock Login ดึง Session Cookie
export function setup() {
  const payload = JSON.stringify({
    email: `load-test-${Date.now()}@example.com`,
    displayName: "Load Tester",
  });

  const res = http.post(`${BASE_URL}/api/auth/dev-sign-in`, payload, {
    headers: { "Content-Type": "application/json" },
  });

  let cookies = "";
  if (res.cookies && Object.keys(res.cookies).length > 0) {
    const cookieNames = Object.keys(res.cookies);
    cookies = cookieNames
      .map((name) => `${name}=${res.cookies[name][0].value}`)
      .join("; ");
  }

  // ส่ง cookie ต่อไปให้ VU (Virtual User) แต่ละตัวใช้รันเทสต์
  return { cookies };
}

// โค้ดส่วนนี้คือ User Journey ที่ VU แต่ละตัวจะรันซ้ำๆ
export default function (data) {
  // ตั้งค่า Header พื้นฐานและแนบ Cookie ที่ได้จากการ setup()
  const reqOptions = {
    headers: {
      Cookie: data.cookies,
      "Content-Type": "application/json",
    },
  };

  group("Browse and select classrooms", () => {
    // 1. ดึงข้อมูลรายชื่อ Classroom
    const listRes = http.get(
      `${BASE_URL}/api/classrooms`,
      Object.assign({}, reqOptions, {
        tags: { name: "list" }, // tag ทำให้ตั้ง threshold ราย endpoint ได้
      }),
    );

    check(listRes, {
      "list status 200": (r) => r.status === 200,
      "list is array": (r) => Array.isArray(r.json("classrooms")), // ตรวจสอบโครงสร้าง response เล็กน้อย
    });

    errorRate.add(listRes.status !== 200);
    sleep(1); // think time — คนไม่ได้คลิกรัวๆ
  });

  group("Create classroom action", () => {
    // 2. สร้าง Classroom ใหม่
    const payload = JSON.stringify({
      // ใส่ตัวแปร __VU และ __ITER เพื่อไม่ให้ชื่อซ้ำกันเกินไป
      name: `Performance Test Class ${__VU}-${__ITER}`,
    });

    const createRes = http.post(
      `${BASE_URL}/api/classrooms`,
      payload,
      Object.assign({}, reqOptions, {
        tags: { name: "create" },
      }),
    );

    // ใช้เวลาที่ k6 วัดเอง แม่นกว่า Date.now()
    classroomLatency.add(createRes.timings.duration);

    check(createRes, { "create status 201": (r) => r.status === 201 });
    errorRate.add(createRes.status !== 201);
    sleep(2);
  });
}
