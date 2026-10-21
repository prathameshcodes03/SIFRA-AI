-- One-time data fix.
--
-- The accuracy counters were previously filled with a per-FRAME metric: every
-- 600ms model sample was counted, including the frames between repetitions.
-- The shipped model has no standing pose in its training data, so those
-- frames were always answered "shallow" and scored as incorrect form. A
-- perfectly good squat set was therefore stored as 119 samples / 0 correct,
-- i.e. 0% accuracy, and the Dashboard kept reporting it forever.
--
-- Accuracy is now scored per COMPLETED REPETITION, from the same form verdict
-- the coach speaks. The old counters do not describe that metric, so they are
-- cleared instead of being carried into the new aggregate: the Dashboard shows
-- an honest "no workout data yet" until a session is recorded with the
-- corrected metric.
--
-- The streak history is untouched: "completedAt" is what counts there.

UPDATE "Workout"
SET "totalPredictions" = 0,
    "correctPredictions" = 0,
    "accuracy" = NULL;
