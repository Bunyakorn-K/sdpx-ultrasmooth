import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: __ENV.SMOKE === "1"
    ? [{ duration: "5s", target: 2 }, { duration: "10s", target: 2 }, { duration: "5s", target: 0 }]
    : [{ duration: "30s", target: 5 }, { duration: "1m", target: 10 }, { duration: "30s", target: 0 }],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
  },
};

const base = __ENV.BASE_URL || "http://127.0.0.1:3000";

export default function () {
  for (const path of ["/", "/sign-up", "/api/health"]) {
    const response = http.get(`${base}${path}`, { tags: { name: path } });
    check(response, { "public journey responds successfully": (result) => result.status === 200 });
    sleep(1);
  }
}
