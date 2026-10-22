/**
 * Choosing the next exercise of a session.
 *
 * WHY
 * ---
 * The camera used to auto-advance to "the next entry in the workout list".
 * The list is the user's whole PLAN, ordered by creation date, and it contains
 * every exercise they have ever added - including the ones they finished
 * days ago. So finishing an exercise could launch an old, already-completed
 * session, and completing that one RE-DATED it to today.
 *
 * That silently rewrote the user's workout history: the day the workout was
 * originally performed disappeared from the streak and today was counted
 * instead, which is what made the streak look like it had stalled.
 *
 * The next exercise is therefore always one that has NOT been completed yet,
 * and the currently running workout is excluded so the value does not shift
 * when the session's own completion refreshes the list underneath it.
 */

/**
 * Is this timestamp on the same calendar day as now, in the browser's own
 * time zone?
 *
 * The browser's zone is the user's zone, and it is the same one the backend
 * groups workout days by (it is sent with every request), so the two agree
 * on what "today" means.
 *
 * @param {string|Date|null} value
 * @param {number|Date} [reference]
 * @returns {boolean}
 */
export function isSameLocalDay(value, reference = Date.now()) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date(reference);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/**
 * The PLAN: the exercises that are still outstanding, plus the ones that were
 * completed today.
 *
 * The plan builder used to list EVERY workout the user had ever created.
 * That was actively harmful: yesterday's finished workouts sat in the list
 * looking like plan entries, and removing them deleted the RECORD of those
 * workouts - which is exactly what the streak is built from. A user tidying
 * up their plan silently lost their history, and the streak went down with it.
 *
 * The plan is a plan, not a history.
 *
 * @param {Array<{id:string, completed?:boolean, completedAt?:string|null}>} workouts
 * @param {number|Date} [now]
 * @returns {Array<object>}
 */
export function selectPlanWorkouts(workouts = [], now = Date.now()) {
  if (!Array.isArray(workouts)) return [];
  return workouts.filter(
    (workout) =>
      workout && (!workout.completed || isSameLocalDay(workout.completedAt, now))
  );
}

/**
 * @param {Array<{id:string, completed?:boolean}>} workouts
 * @param {string|null} currentWorkoutId the workout being performed right now
 * @returns {object|null} the next outstanding workout, or null when the plan
 *   has nothing left to do.
 */
export function findNextOutstandingWorkout(workouts, currentWorkoutId = null) {
  if (!Array.isArray(workouts)) return null;

  return (
    workouts.find(
      (workout) =>
        workout &&
        !workout.completed &&
        workout.id !== currentWorkoutId
    ) ?? null
  );
}
