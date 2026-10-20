import test from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { createLogger } from "@/shared/server/logger";
test("SEC08: logger redacts emails, passwords, tokens and cookie/authorization headers", () => {
  const chunks: string[] = [];
  const sink = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  const logger = createLogger(sink);
  // Exercise redaction even when the surrounding test runner silences app logs.
  logger.level = "info";
  logger.info({
    event: "redaction_probe",
    email: "private@example.invalid",
    password: "private-password",
    token: "private-token",
    req: {
      headers: {
        authorization: "Bearer private-authorization",
        cookie: "private-cookie",
      },
    },
  });
  const output = chunks.join("");
  assert.doesNotMatch(
    output,
    /private@example|private-password|private-token|private-authorization|private-cookie/,
  );
  assert.match(output, /REDACTED/);
});
