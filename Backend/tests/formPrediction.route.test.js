const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const app = require("../src/app.js");
const {
  validatePredictionFeatures,
} = require("../src/Controllers/formPrediction.controller.js");

let server;
let basePort;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  basePort = server.address().port;
});

test.after(() => {
  server.close();
});

const post = (path, payload) =>
  new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = http.request(
      {
        port: basePort,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
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
          resolve({ status: res.statusCode, body: parsed, raw: data });
        });
      }
    );
    req.on("error", reject);
    req.end(body);
  });

const postPredict = (payload) => post("/api/workout/predict", payload);

const get = (path, headers = {}) =>
  new Promise((resolve, reject) => {
    const req = http.get({ port: basePort, path, headers }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = null;
        }
        resolve({ status: res.statusCode, body: parsed, raw: data });
      });
    });
    req.on("error", reject);
  });

test("prediction endpoint rejects an unsupported exercise", async () => {
  const res = await postPredict({
    exercise: "burpee",
    knee_angle: 90,
    elbow_angle: 90,
    hip_angle: 90,
    body_angle: 170,
    symmetry_score: 0.9,
    landmark_visibility: 0.9,
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test("prediction endpoint rejects out-of-range angles", async () => {
  const res = await postPredict({
    exercise: "squat",
    knee_angle: 400,
    elbow_angle: 90,
    hip_angle: 90,
    body_angle: 170,
    symmetry_score: 0.9,
    landmark_visibility: 0.9,
  });

  assert.equal(res.status, 400);
  assert.match(res.body.message, /knee_angle/);
});

test("prediction endpoint rejects out-of-range scores", async () => {
  const res = await postPredict({
    exercise: "squat",
    knee_angle: 90,
    elbow_angle: 90,
    hip_angle: 90,
    body_angle: 170,
    symmetry_score: 1.5,
    landmark_visibility: 0.9,
  });

  assert.equal(res.status, 400);
  assert.match(res.body.message, /symmetry_score/);
});

test("prediction endpoint rejects a non-numeric angle", async () => {
  const res = await postPredict({
    exercise: "squat",
    knee_angle: "ninety",
    elbow_angle: 90,
    hip_angle: 90,
    body_angle: 170,
    symmetry_score: 0.9,
    landmark_visibility: 0.9,
  });

  assert.equal(res.status, 400);
  assert.match(res.body.message, /knee_angle must be a finite number/);
});

test("prediction endpoint rejects a missing body", async () => {
  const res = await postPredict({});
  assert.equal(res.status, 400);
});

test("the extra orientation fields the client now sends are ignored, not rejected", async () => {
  // The browser sends the body's orientation alongside the joint angles.
  // They are not model features, so they must neither fail validation nor be
  // forwarded - the whitelist is what guarantees that.
  const validation = validatePredictionFeatures({
    exercise: "squat",
    knee_angle: 90,
    elbow_angle: 170,
    hip_angle: 95,
    body_angle: 165,
    symmetry_score: 0.9,
    landmark_visibility: 0.95,
    body_tilt: 12,
    pose_visibility: 0.95,
    knee_asymmetry: 2,
    hip_asymmetry: 1,
    measured: { knee: true, elbow: true, hip: true, body: true, tilt: true },
  });

  assert.equal(validation.error, undefined, "an extra field must not fail validation");
  assert.deepEqual(
    Object.keys(validation.features).sort(),
    [
      "body_angle",
      "elbow_angle",
      "exercise",
      "hip_angle",
      "knee_angle",
      "landmark_visibility",
      "symmetry_score",
    ],
    "only the model's own features may be forwarded"
  );
});

test("protected workout routes still require authentication", async () => {
  for (const path of ["/api/workouts/stats", "/api/workouts", "/api/auth/me"]) {
    const res = await get(path);
    assert.equal(res.status, 401, `${path} must be protected`);
    assert.equal(res.body.success, false);
  }
});

test("workout completion without auth is rejected", async () => {
  const res = await post("/api/workouts/complete", {
    exercise: "squat",
    sets: 3,
    reps: 10,
    totalPredictions: 10,
    correctPredictions: 8,
  });

  assert.equal(res.status, 401, "completion must require authentication");
  assert.equal(res.body.success, false);
  assert.equal(res.body.workout, undefined);
});

test("voice coaching rejects an empty text payload", async () => {
  const res = await post("/api/voice/coaching", {});

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});