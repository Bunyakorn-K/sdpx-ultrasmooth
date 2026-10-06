import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const classroomLatency = new Trend("classroom_list_latency", true);

export const options = {
  stages: [
    { duration: "30s", target: 5 },
    { duration: "1m", target: 10 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
    errors: ["rate<0.05"],
    classroom_list_latency: ["p(95)<300"],
    "http_req_duration{name:classroom_list}": ["p(95)<300"],
  },
};

const baseUrl = (__ENV.BASE_URL || "").replace(/\/+$/, "");
const testEmail = __ENV.PERF_TEST_EMAIL;

if (!/^https:\/\//.test(baseUrl) || baseUrl === "https://sdpx-ultrasmooth.vercel.app") {
  throw new Error("BASE_URL must point to the separate HTTPS staging project.");
}
if (!testEmail) {
  throw new Error("PERF_TEST_EMAIL must identify a staging test account.");
}

export default function () {
  group("Browse and sign in", () => {
    const home = http.get(`${baseUrl}/`, { tags: { name: "homepage" } });
    check(home, { "homepage status is 200": (response) => response.status === 200 });
    errorRate.add(home.status !== 200);
    sleep(1);

    const signIn = http.post(
      `${baseUrl}/api/auth/dev-sign-in`,
      JSON.stringify({ email: testEmail }),
      { headers: { "Content-Type": "application/json" }, tags: { name: "sign_in" } },
    );
    check(signIn, { "sign-in status is 200": (response) => response.status === 200 });
    errorRate.add(signIn.status !== 200);
    sleep(1);
  });

  group("Review classrooms and sign out", () => {
    const classrooms = http.get(`${baseUrl}/api/classrooms`, { tags: { name: "classroom_list" } });
    classroomLatency.add(classrooms.timings.duration);
    check(classrooms, {
      "classroom list status is 200": (response) => response.status === 200,
      "classroom list has an array": (response) => {
        if (response.status !== 200) return false;
        const body = response.json();
        return Array.isArray(body.classrooms);
      },
    });
    errorRate.add(classrooms.status !== 200);
    sleep(1);

    const signOut = http.post(`${baseUrl}/api/auth/sign-out`, null, { tags: { name: "sign_out" } });
    check(signOut, { "sign-out status is 200": (response) => response.status === 200 });
    errorRate.add(signOut.status !== 200);
    sleep(1);
  });
}
