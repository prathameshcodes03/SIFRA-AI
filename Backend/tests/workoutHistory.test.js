const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");

const app = require("../src/app.js");
const { prisma } = require("../src/data/db.js");

/**
 * A completed workout is HISTORY.
 *
 * The bug: the plan builder listed every workout the user had ever created,
 * so yesterday's finished workouts sat in the list looking like plan entries.
 * Removing them (the trash button) deleted the RECORD of those workouts - and
 * the streak, which is built from exactly those records, went DOWN. A user
 * tidying up their plan silently lost their training history.
 *
 * The fix has two halves: the plan only lists the outstanding exercises and
 * today's, and the API refuses to delete a completed workout at all.
 */

let server;
let basePort;
let user;
let token;

const request = (method, path, body) =>
  new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const headers = { Cookie: `token=${token}` };
    if (payload) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = http.request(
      { port: basePort, path, method, headers },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
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
    if (payload) req.write(payload);
    req.end();
  });

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  basePort = server.address().port;

  const email = `history-guard-${Date.now()}@test.local`;
  user = await prisma.user.create({
    data: {
      fullName: "History Guard Test",
      email,
      password: "not-a-real-hash",
      age: 25,
      gender: "OTHER",
      weight: 70,
    },
  });
  token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
});

test.after(async () => {
  // The user's workouts cascade.
  await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  server.close();
});

test("an outstanding plan entry can still be deleted", async () => {
  const workout = await prisma.workout.create({
    data: {
      exercise: "Squat",
      sets: 3,
      reps: 10,
      completed: false,
      userId: user.id,
    },
  });

  const res = await request("DELETE", `/api/workouts/${workout.id}`);

  assert.equal(res.status, 200);
  const remaining = await prisma.workout.findUnique({ where: { id: workout.id } });
  assert.equal(remaining, null, "the plan entry is gone");
});

test("a completed workout is refused, so the history cannot be destroyed", async () => {
  const workout = await prisma.workout.create({
    data: {
      exercise: "Squat",
      sets: 3,
      reps: 10,
      completed: true,
      completedAt: new Date(),
      userId: user.id,
    },
  });

  const res = await request("DELETE", `/api/workouts/${workout.id}`);

  assert.equal(res.status, 409, "a completed workout is not deletable");
  const remaining = await prisma.workout.findUnique({ where: { id: workout.id } });
  assert.ok(remaining, "the history survives");
  assert.equal(remaining.completed, true);
  assert.ok(remaining.completedAt, "and so does the day it was completed on");
});

test("another user's workout is still refused", async () => {
  const other = await prisma.workout.create({
    data: {
      exercise: "Squat",
      sets: 3,
      reps: 10,
      completed: false,
      userId: user.id,
    },
  });

  const foreignToken = jwt.sign(
    { id: "00000000-0000-0000-0000-000000000000", email: "nobody@test.local" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const res = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        port: basePort,
        path: `/api/workouts/${other.id}`,
        method: "DELETE",
        headers: { Cookie: `token=${foreignToken}` },
      },
      (r) => {
        let data = "";
        r.on("data", (c) => (data += c));
        r.on("end", () => resolve({ status: r.statusCode, body: JSON.parse(data || "{}") }));
      }
    );
    req.on("error", reject);
    req.end();
  });

  assert.equal(res.status, 403);
});
