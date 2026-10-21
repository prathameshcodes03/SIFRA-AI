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
