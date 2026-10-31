const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

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

  const email = `revocation-${Date.now()}@test.local`;
  user = await prisma.user.create({
    data: {
      fullName: "Revocation Test",
      email,
      password: await bcrypt.hash("password123", 10),
      age: 25,
      gender: "OTHER",
      weight: 70,
      tokenVersion: 0,
    },
  });
  token = jwt.sign(
    { id: user.id, email: user.email, tv: 0 },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
});

test.after(async () => {
  await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  server.close();
});

const get = (token) =>
  new Promise((resolve, reject) => {
    const req = http.get(
      { port: basePort, path: "/api/auth/me", headers: { Cookie: `token=${token}`, Origin: "http://localhost:5173" } },
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
  });

test("existing session works before reset", async () => {
  const res = await get(token);
  assert.equal(res.status, 200);
});

test("missing tv is treated as version 0 (no lockout)", async () => {
  const t = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const res = await get(t);
  assert.equal(res.status, 200);
});

test("incrementing tokenVersion invalidates old session", async () => {
  await prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } });
  const res = await get(token);
  assert.equal(res.status, 401);
});

test("new login issues valid session", async () => {
  const res = await new Promise((resolve, reject) => {
    const body = JSON.stringify({ email: user.email, password: "password123" });
    const req = http.request(
      { port: basePort, path: "/api/auth/login", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), Origin: "http://localhost:5173" } },
      (r) => {
        let data = "";
        r.on("data", (c) => (data += c));
        r.on("end", () => {
          let parsed = null;
          try { parsed = JSON.parse(data); } catch { parsed = null; }
          resolve({ status: r.statusCode, body: parsed, headers: r.headers });
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
  assert.equal(res.status, 200);
  // cookie should be set
  assert.ok(res.headers["set-cookie"]);
});