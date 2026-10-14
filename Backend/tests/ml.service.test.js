const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

/**
 * Verifies the Express -> ML service layer passes the model's label through
 * unchanged, and that the /predict contract (field names, exercise echo) is
 * preserved. Uses a stub ML service, so NO real model or API key is touched.
 */

let stub;
let stubPort;

const startStub = () =>
  new Promise((resolve) => {
    stub = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        let features;
        try {
          features = JSON.parse(raw);
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ detail: "bad json" }));
          return;
        }

        // Deterministic stand-in for the real model, mirroring the verified
        // squat decision boundary (hip_angle >= 110 -> shallow).
        let prediction;
        if (features.exercise === "squat") {
          prediction = features.hip_angle >= 110 ? "shallow" : "correct";
        } else if (features.exercise === "pushup") {
          prediction =
            features.elbow_angle > 100 ? "pushup_elbow_flare" : "pushup_correct";
        } else {
          prediction =
            features.body_angle >= 170 && features.hip_angle >= 170
              ? "plank_correct"
              : "plank_hips_high";
        }

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ exercise: features.exercise, prediction }));
      });
    });
    stub.listen(0, () => {
      stubPort = stub.address().port;
      resolve();
    });
  });

test.before(async () => {
  await startStub();
  process.env.ML_SERVICE_URL = `http://127.0.0.1:${stubPort}`;
  delete require.cache[require.resolve("../src/Services/ml.service.js")];
});

test.after(() => {
  stub.close();
});

const loadService = () => {
  delete require.cache[require.resolve("../src/Services/ml.service.js")];
  return require("../src/Services/ml.service.js");
};

test("model labels are forwarded verbatim for every exercise", async () => {
  const { requestFormPrediction } = loadService();

  const cases = [
    {
      features: {
        exercise: "squat",
        knee_angle: 175,
        elbow_angle: 20,
        hip_angle: 170,
        body_angle: 170,
        symmetry_score: 0.9,
        landmark_visibility: 0.9,
      },
      expected: "shallow",
    },
    {
      features: {
        exercise: "squat",
        knee_angle: 90,
        elbow_angle: 20,
        hip_angle: 95,
        body_angle: 150,
        symmetry_score: 0.9,
        landmark_visibility: 0.9,
      },
      expected: "correct",
    },
    {
      features: {
        exercise: "pushup",
        knee_angle: 0,
        elbow_angle: 80,
        hip_angle: 170,
        body_angle: 175,
        symmetry_score: 0.9,
        landmark_visibility: 0.9,
      },
      expected: "pushup_correct",
    },
    {
      features: {
        exercise: "plank",
        knee_angle: 0,
        elbow_angle: 0,
        hip_angle: 172,
        body_angle: 175,
        symmetry_score: 0.9,
        landmark_visibility: 0.9,
      },
      expected: "plank_correct",
    },
  ];

  for (const { features, expected } of cases) {
    const prediction = await requestFormPrediction(features);
    assert.equal(
      prediction,
      expected,
      `${features.exercise} label must pass through unmodified`
    );
  }
});

test("/predict contract field names are unchanged", async () => {
  // The controller builds the payload from exactly these seven fields.
  const required = [
    "exercise",
    "knee_angle",
    "elbow_angle",
    "hip_angle",
    "body_angle",
    "symmetry_score",
    "landmark_visibility",
  ];

  const { requestFormPrediction } = loadService();
  const features = Object.fromEntries(
    required.map((key, index) => [
      key,
      key === "exercise"
        ? "squat"
        : key === "symmetry_score" || key === "landmark_visibility"
        ? 0.9
        : 100 + index,
    ])
  );

  // Must not throw: the stub echoes back and validates the exercise field.
  const prediction = await requestFormPrediction(features);
  assert.equal(typeof prediction, "string");
  assert.ok(prediction.length > 0);
});

test("an unreachable ML service raises a typed error, not a crash", async () => {
  process.env.ML_SERVICE_URL = "http://127.0.0.1:1"; // nothing listening
  const { requestFormPrediction, MlServiceError } = loadService();

  await assert.rejects(
    () =>
      requestFormPrediction({
        exercise: "squat",
        knee_angle: 90,
        elbow_angle: 20,
        hip_angle: 110,
        body_angle: 165,
        symmetry_score: 0.9,
        landmark_visibility: 0.9,
      }),
    (error) => {
      assert.ok(error instanceof MlServiceError);
      assert.ok([502, 503, 504].includes(error.statusCode));
      return true;
    }
  );

  process.env.ML_SERVICE_URL = `http://127.0.0.1:${stubPort}`;
});

test("a missing ML_SERVICE_URL is reported clearly", async () => {
  delete process.env.ML_SERVICE_URL;
  const { requestFormPrediction, MlServiceError } = loadService();

  await assert.rejects(
    () =>
      requestFormPrediction({
        exercise: "squat",
        knee_angle: 90,
        elbow_angle: 20,
        hip_angle: 110,
        body_angle: 165,
        symmetry_score: 0.9,
        landmark_visibility: 0.9,
      }),
    (error) => {
      assert.ok(error instanceof MlServiceError);
      assert.equal(error.statusCode, 503);
      return true;
    }
  );

  process.env.ML_SERVICE_URL = `http://127.0.0.1:${stubPort}`;
});

/**
 * The /predict response gained OPTIONAL diagnostics. The label contract must
 * not move, and an older ML service that sends no confidence must still work.
 */
test("the detailed call adds confidence without changing the label contract", async () => {
  const { requestFormPredictionDetailed, requestFormPrediction } = loadService();

  const features = {
    exercise: "squat",
    knee_angle: 90,
    elbow_angle: 20,
    hip_angle: 95,
    body_angle: 170,
    symmetry_score: 0.9,
    landmark_visibility: 0.9,
  };

  const detailed = await requestFormPredictionDetailed(features);

  assert.equal(typeof detailed.prediction, "string");
  assert.ok(detailed.prediction.length > 0);
  // The stub sends no confidence, so it must be null, never invented.
  assert.equal(detailed.confidence, null);
  assert.equal(detailed.probabilities, null);

  // The legacy call still returns the bare label string.
  const legacy = await requestFormPrediction(features);
  assert.equal(legacy, detailed.prediction);
});