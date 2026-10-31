const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");

const app = require("../src/app.js");
const { prisma } = require("../src/data/db.js");

let server;
let basePort;
let user;
let token;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  basePort = server.address().port;

  const email = `csrf-${Date.now()}@test.local`;
  user = await prisma.user.create({
    data: {
      fullName: "CSRF Test",
      email,
      password: "not-a-real-hash",
      age: 25,
      gender: "OTHER",
      weight: 70,
    },
  });
  token = jwt.sign(
    { id: user.id, email: user.email, tv: user.tokenVersion ?? 0 },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
});

test.after(async () => {
  await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  server.close();
});

const post = (path, headers = {}) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      { port: basePort, path, method: "POST", headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let parsed = null;
          try { parsed = JSON.parse(data); } catch { parsed = null; }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });

test("allowed origin passes CSRF for state-changing request", async () => {
  const res = await post("/api/workouts", {
    Cookie: `token=${token}`,
    Origin: "http://localhost:5173",
    "Content-Type": "application/json",
  });
  // May be 400/422 due to missing body, but not 403 CSRF.
  assert.notEqual(res.status, 403);
});

test("disallowed origin is rejected with 403", async () => {
  const res = await post("/api/workouts", {
    Cookie: `token=${token}`,
    Origin: "https://evil.example.com",
    "Content-Type": "application/json",
  });
  assert.equal(res.status, 403);
});

test("missing Origin and Referer with cookie is rejected", async () => {
  const res = await post("/api/workouts", {
    Cookie: `token=${token}`,
    "Content-Type": "application/json",
  });
  assert.equal(res.status, 403);
});

test("invalid Referer is rejected", async () => {
  const res = await post("/api/workouts", {
    Cookie: `token=${token}`,
    Referer: "not-a-url",
    "Content-Type": "application/json",
  });
  assert.equal(res.status, 403);
});

test("request without cookie and without origin is allowed (non-browser)", async () => {
  const res = await post("/api/health", {});
  // health is GET-only route; POST may be 404, but not 403 CSRF.
  assert.notEqual(res.status, 403);
});

test("GET requests are not subject to CSRF check", async () => {
  const res = await new Promise((resolve, reject) => {
    const req = http.get(
      { port: basePort, path: "/api/health", headers: { Cookie: `token=${token}` } },
      (r) => {
        let data = "";
        r.on("data", (c) => (data += c));
        r.on("end", () => resolve({ status: r.statusCode }));
      }
    );
    req.on("error", reject);
  });
  assert.equal(res.status, 200);
});