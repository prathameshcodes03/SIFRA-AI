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

  user = await prisma.user.create({
    data: {
      fullName: "Current User Test",
      email: `currentuser-${Date.now()}@test.local`,
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

const get = (path, headers = {}) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      { port: basePort, path, method: "GET", headers },
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

test("current-user without token returns 401", async () => {
  const res = await get("/api/auth/me");
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test("current-user with valid token returns user data without password", async () => {
  const res = await get("/api/auth/me", {
    Cookie: `token=${token}`,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.user);
  assert.equal(res.body.user.id, user.id);
  assert.equal(res.body.user.email, user.email);
  assert.equal(res.body.user.fullName, user.fullName);
  assert.equal(res.body.user.password, undefined);
});

test("current-user with invalid token returns 401", async () => {
  const res = await get("/api/auth/me", {
    Cookie: "token=invalid.token.value",
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});
