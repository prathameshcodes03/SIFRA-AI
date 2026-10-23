import test from "node:test";
import assert from "node:assert/strict";

import {
  CAMERA_STATUS,
  describeCameraError,
  trackingStatusCopy,
} from "../src/components/Workout/cameraStatus.js";

test("camera permission errors have a clear recovery message", () => {
  assert.match(
    describeCameraError({ name: "NotAllowedError" }),
    /allow camera access/i,
  );
  assert.match(
    describeCameraError({ name: "NotFoundError" }),
    /no camera was found/i,
  );
  assert.match(
    describeCameraError({ name: "NotReadableError" }),
    /another app/i,
  );
});

test("tracking is not presented as active until a valid pose exists", () => {
  assert.equal(
    trackingStatusCopy(CAMERA_STATUS.REQUESTING_PERMISSION),
    "REQUESTING CAMERA…",
  );
  assert.equal(
    trackingStatusCopy(CAMERA_STATUS.WAITING_FOR_POSE),
    "STEP INTO FRAME…",
  );
  assert.equal(
    trackingStatusCopy(CAMERA_STATUS.TRACKING),
    "TRACKING ACTIVE",
  );
});

test("an unknown camera failure still gives the user a safe retry instruction", () => {
  assert.match(describeCameraError({ name: "UnknownError" }), /try again/i);
});
