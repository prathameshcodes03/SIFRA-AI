import test from "node:test";
import assert from "node:assert/strict";

import { createCoachDiagnostics } from "../src/utils/diagnostics.js";

/** Records what would be written to the console, with a controllable clock. */
const collector = ({ intervalMs = 1500, enabled = true, start = 1000 } = {}) => {
  const lines = [];
  let now = start;
  const diagnostics = createCoachDiagnostics({
    enabled,
    intervalMs,
    sink: (line) => lines.push(line),
    now: () => now,
  });
  return {
    diagnostics,
    lines,
    advance: (ms) => {
      now += ms;
    },
    records: () => lines.map((line) => JSON.parse(line.replace("[sifra:coach] ", ""))),
  };
};

const sample = (overrides = {}) => ({
  exercise: "squat",
  features: {
    knee_angle: 95,
    hip_angle: 92,
    body_angle: 165,
    symmetry_score: 0.96,
    landmark_visibility: 0.95,
    knee_asymmetry: 3,
  },
  reliability: 0.93,
  reliable: true,
  phase: "down",
  smoothedKneeAngle: 96,
  elapsedMs: 180,
  model: { ok: true, label: "shallow", confidence: 0.97, status: 200 },
  assessment: { label: "correct", reason: "at_comfortable_depth", evidence: {} },
  resolution: {
    label: "correct",
    source: "geometry",
    reason: "model_disagrees_with_movement",
    mlSupported: false,
  },
  spoken: true,
  message: "Good squat. Keep going.",
  ...overrides,
});

test("diagnostics stay silent when disabled", () => {
  const { diagnostics, lines } = collector({ enabled: false });
  assert.equal(diagnostics.isActive(), false);
  for (let i = 0; i < 20; i += 1) diagnostics.log(sample());
  assert.deepEqual(lines, []);
});

test("output is throttled rather than one line per camera frame", () => {
  const { diagnostics, records, advance } = collector({ intervalMs: 1500 });
  // 20 predictions 400ms apart = 8 seconds of continuous coaching.
  for (let i = 0; i < 20; i += 1) {
    advance(400);
    diagnostics.log(sample());
  }

  const emitted = records();
  assert.ok(
    emitted.length < 20 && emitted.length >= 4,
    `expected throttled output, got ${emitted.length} records from 20 calls`
  );

  // Every consecutive pair is at least the window apart.
  for (let i = 1; i < emitted.length; i += 1) {
    assert.ok(
      emitted[i].sinceLastMs >= 1500,
      `records ${i - 1}->${i} were only ${emitted[i].sinceLastMs}ms apart`
    );
  }
});

test("a record separates the raw model result from the coaching decision", () => {
  const { diagnostics, records, advance } = collector({ intervalMs: 0 });
  advance(10);
  diagnostics.log(sample());

  const [record] = records();
  assert.equal(record.model.label, "shallow", "the raw model label is preserved");
  assert.equal(record.model.confidence, 0.97);
  assert.equal(record.decision.label, "correct");
  assert.equal(record.decision.source, "geometry");
  assert.equal(record.decision.reason, "model_disagrees_with_movement");
  assert.equal(record.decision.mlSupported, false);
});

test("confidence is reported as null when the service did not send it", () => {
  const { diagnostics, records, advance } = collector({ intervalMs: 0 });
  advance(10);
  diagnostics.log(sample({ model: { ok: false, label: null, status: 503 } }));

  const [record] = records();
  assert.equal(record.model.ok, false);
  assert.equal(record.model.confidence, null, "never invented");
  assert.equal(record.model.status, 503);
});

test("a network failure is logged as a failure, not as a form fault", () => {
  const { diagnostics, records, advance } = collector({ intervalMs: 0 });
  advance(10);
  diagnostics.log(
    sample({
      model: { ok: false, label: null, status: "network_error", error: null },
      assessment: null,
      resolution: { label: null, source: "none", reason: "no_completed_rep", mlSupported: false },
      spoken: false,
      message: null,
    })
  );

  const [record] = records();
  assert.equal(record.model.ok, false);
  assert.equal(record.model.status, "network_error");
  assert.equal(record.decision, null, "no form claim is made");
  assert.equal(record.spoken, false);
});

test("records carry no imagery, credentials or personal data", () => {
  const { diagnostics, lines, advance } = collector({ intervalMs: 0 });
  advance(10);
  diagnostics.log(sample());

  const line = lines[0];
  for (const forbidden of [
    "image",
    "frame",
    "base64",
    "dataUrl",
    "token",
    "apiKey",
    "password",
    "email",
    "landmark",
  ]) {
    assert.ok(!line.toLowerCase().includes(forbidden.toLowerCase()), `log leaked ${forbidden}`);
  }
  // Only derived scalars are present.
  assert.match(line, /"knee":95/);
});

test("the rule fallback is identified when the model is bypassed", () => {
  const { diagnostics, records, advance } = collector({ intervalMs: 0 });
  advance(10);
  diagnostics.log(sample({ ruleFallback: "movement_assessment_used" }));

  assert.equal(records()[0].ruleFallback, "movement_assessment_used");
});

test("dropped records are counted so throttling is visible", () => {
  const { diagnostics, records, advance } = collector({ intervalMs: 1000 });
  advance(10);
  diagnostics.log(sample());
  for (let i = 0; i < 5; i += 1) {
    advance(100);
    diagnostics.log(sample());
  }
  advance(1000);
  diagnostics.log(sample());

  const all = records();
  assert.equal(all.length, 2);
  assert.equal(all[0].throttledAway, 0);
  assert.equal(all[1].throttledAway, 5, "throttled records are accounted for");
});