const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const app = require("../src/app.js");

let server;
let basePort;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  basePort = server.address().port;
});

test.after(async () => {
  server.close();
});

const postVoice = (body) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      {
        port: basePort,
        path: "/api/voice/coaching",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = null;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on("error", reject);
    req.end(JSON.stringify(body || {}));
  });

test("voice coaching rejects missing text with 400 (below rate limit)", async () => {
  const res = await postVoice({});
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Text is required");
});

test("voice coaching rate limit: repeated requests eventually receive 429", async () => {
  let status429At = null;
  const maxAttempts = 25;

  for (let i = 0; i < maxAttempts; i += 1) {
    const res = await postVoice({ text: `rate limit test ${i}` });
    if (res.status === 429) {
      status429At = i + 1;
      break;
    }
  }

  assert.ok(
    status429At,
    `Expected to receive 429 within ${maxAttempts} requests, but none arrived`
  );
  // With a 20-request/minute limit, 429 should arrive around the 20th-21st
  // request (may vary slightly if other tests in the same process consumed
  // tokens from the shared in-memory store).
  assert.ok(
    status429At >= 18 && status429At <= 22,
    `Expected 429 around request 20-21, got ${status429At}`
  );
});

test("voice coaching rate limit response has correct error shape", async () => {
  // Exhaust the limit by making enough requests to trigger 429.
  let exhausted = false;
  for (let i = 0; i < 25 && !exhausted; i += 1) {
    const res = await postVoice({ text: `exhaust ${i}` });
    if (res.status === 429) {
      exhausted = true;
      assert.equal(res.body.success, false);
      assert.equal(
        res.body.message,
        "Too many voice coaching requests. Please try again later."
      );
    }
  }
  assert.ok(exhausted, "Expected to exhaust the rate limit within 25 requests");
});
