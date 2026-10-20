import http from "k6/http";
import { check, group, sleep, fail } from "k6";
import { Rate, Trend } from "k6/metrics";
const errors = new Rate("errors");
const creationLatency = new Trend("assignment_creation_latency", true);
const strict = __ENV.STRICT_THRESHOLDS === "1";
const smoke = __ENV.K6_PROFILE === "smoke";
const baseURL = __ENV.BASE_URL || "http://127.0.0.1:3200";
const origin = __ENV.APP_ORIGIN || baseURL;
export const options = {
  stages: smoke
    ? [{ duration: "10s", target: 1 }]
    : [
        { duration: "30s", target: 5 },
        { duration: "1m", target: 10 },
        { duration: "30s", target: 0 },
      ],
  thresholds: {
    http_req_duration: [strict ? "p(95)<1" : "p(95)<500"],
    http_req_failed: ["rate<0.01"],
    errors: ["rate<0.05"],
    assignment_creation_latency: [strict ? "p(95)<1" : "p(95)<300"],
    "http_req_duration{name:list}": ["p(95)<300"],
    "http_req_duration{name:detail}": ["p(95)<300"],
    "http_req_duration{name:create}": ["p(95)<300"],
  },
};
export function setup() {
  if (!__ENV.K6_USER_EMAIL || !__ENV.K6_USER_PASSWORD)
    fail(
      "Provide a dedicated staging/test teacher account through environment variables.",
    );
  const health = http.get(`${baseURL}/api/health`, {
    tags: { name: "health" },
  });
  if (health.status !== 200) fail("Target is not ready.");
  const login = http.post(
    `${baseURL}/api/auth/login`,
    JSON.stringify({
      email: __ENV.K6_USER_EMAIL,
      password: __ENV.K6_USER_PASSWORD,
    }),
    {
      headers: { "Content-Type": "application/json", Origin: origin },
      tags: { name: "login" },
    },
  );
  if (login.status !== 200)
    fail("The dedicated test teacher could not authenticate.");
  const cookie = login.cookies.pair_session?.[0]?.value;
  if (!cookie) fail("Authentication did not issue a session.");
  const initial = http.post(
    `${baseURL}/api/assignments`,
    JSON.stringify({
      title: "k6 baseline seed",
      deadline: new Date(Date.now() + 86400000).toISOString(),
      questions: ["Content"],
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Cookie: `pair_session=${cookie}`,
      },
      tags: { name: "setup" },
    },
  );
  if (initial.status !== 201)
    fail("Unable to create the isolated seed assignment.");
  return { cookie, assignmentId: initial.json("assignment.id") };
}
export default function evaluateAssignments(data) {
  http.cookieJar().set(baseURL, "pair_session", data.cookie);
  group("Browse owned assignments", () => {
    const list = http.get(`${baseURL}/api/assignments`, {
      tags: { name: "list" },
    });
    errors.add(
      !check(list, {
        "list is 200": (response) => response.status === 200,
        "list has data": (response) =>
          Array.isArray(response.json("assignments")),
      }),
    );
    sleep(1);
    const detail = http.get(`${baseURL}/api/assignments/${data.assignmentId}`, {
      tags: { name: "detail" },
    });
    errors.add(
      !check(detail, {
        "detail is 200": (response) => response.status === 200,
      }),
    );
    sleep(1);
  });
  group("Create evaluation work", () => {
    const created = http.post(
      `${baseURL}/api/assignments`,
      JSON.stringify({
        title: `k6 evaluation ${__VU}-${__ITER}`,
        deadline: new Date(Date.now() + 86400000).toISOString(),
        questions: ["Content", "Delivery"],
      }),
      {
        headers: { "Content-Type": "application/json", Origin: origin },
        tags: { name: "create" },
      },
    );
    creationLatency.add(created.timings.duration);
    errors.add(
      !check(created, {
        "create is 201": (response) => response.status === 201,
      }),
    );
    sleep(2);
  });
}
