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

const post = (path, body) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      {
        port: basePort,
        path,
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

test("forgot-password rejects missing email with 400", async () => {
  const res = await post("/api/auth/forgot-password", {});
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Email is required.");
});

test("forgot-password rejects malformed email with 400", async () => {
  const res = await post("/api/auth/forgot-password", {
    email: "not-an-email",
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Invalid email format.");
});

test("forgot-password rejects email with missing TLD with 400", async () => {
  const res = await post("/api/auth/forgot-password", {
    email: "user@domain",
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Invalid email format.");
});

test("forgot-password does not reject a valid email with \"Invalid email format\"", async () => {
  const res = await post("/api/auth/forgot-password", {
    email: "user@example.com",
  });
  // The regex must pass validation. A 429 (rate limit from sendOtpLimiter),
  // 200 (generic success), or 500 (email service) are all acceptable here —
  // the key assertion is that it is NOT rejected for bad email format.
  assert.notEqual(res.body.message, "Invalid email format.");
});
