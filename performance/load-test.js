import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");

export const options = {
  stages: [
    { duration: "30s", target: 5 }, // ramp up
    { duration: "1m", target: 10 }, // steady state
    { duration: "30s", target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% ของ request ต้องเร็วกว่า 500ms
    http_req_failed: ["rate<0.01"],   // Error ต้องน้อยกว่า 1%
    errors: ["rate<0.05"],            // Custom error rate น้อยกว่า 5%
  },
};

const BASE_URL = __ENV.BASE_URL || "https://sdpx-ultrasmooth.vercel.app";

// โค้ดส่วนนี้คือ User Journey ที่ VU แต่ละตัวจะรันซ้ำๆ
export default function () {
  // ยิงไปที่หน้าแรกของตัวเว็บ (Homepage) เพื่อเช็คว่าเว็บเข้าได้ปกติไหม
  const res = http.get(`${BASE_URL}/`);

  // ตรวจสอบว่าได้ HTTP Status 200 (OK) กลับมา
  check(res, {
    "homepage status is 200": (r) => r.status === 200,
  });

  // บันทึกสถิติ Error ถ้าหน้าเว็บไม่ได้ส่ง 200 กลับมา
  errorRate.add(res.status !== 200);

  // sleep จำลองเวลาที่ผู้ใช้งานหยุดอ่านหน้าเว็บ (Think time)
  sleep(1);
}
