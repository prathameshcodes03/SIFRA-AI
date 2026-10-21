/**
 * Calendar-day arithmetic in the USER's time zone.
 *
 * WHY THIS EXISTS
 * ---------------
 * A workout streak counts the consecutive CALENDAR DAYS the user trained on.
 * The server runs in UTC (Render), but the user's day starts in their own
 * zone. A session finished at 00:30 in Asia/Kolkata is 19:00 UTC on the
 * PREVIOUS date, so grouping by the server's date files that session under
 * the wrong day - and the streak stops matching the user's own calendar.
 *
 * The client therefore reports its IANA time zone (see Frontend/src/api/axios.js)
 * and every day key is computed in that zone.
 *
 * Day keys are plain "YYYY-MM-DD" strings and are compared as integer day
 * NUMBERS, so a daylight-saving change (a 23-hour or 25-hour day) can never
 * break or inflate a streak.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const formatterCache = new Map();

/** Is this a time zone the platform actually knows? */
const isValidTimeZone = (timeZone) => {
  if (typeof timeZone !== "string" || !timeZone.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timeZone.trim() });
    return true;
  } catch {
    return false;
  }
};

/**
 * Normalise a client-supplied time zone.
 *
 * An unknown or hostile value falls back to the server's own zone rather than
 * throwing - a bad header must never break the stats endpoint.
 *
 * @param {*} candidate
 * @returns {string|null} the zone, or null meaning "the server's own zone".
 */
const resolveTimeZone = (candidate) => {
  if (typeof candidate !== "string") return null;
  const trimmed = candidate.trim();
  return isValidTimeZone(trimmed) ? trimmed : null;
};

const getFormatter = (timeZone) => {
  const key = timeZone || "__server__";
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
};

/**
 * "YYYY-MM-DD" for an instant, in the given zone.
 *
 * @param {Date|string|number} date
 * @param {string|null} [timeZone] null = the server's own zone
 * @returns {string}
 */
const dayKey = (date, timeZone = null) => {
  const parts = getFormatter(timeZone).formatToParts(new Date(date));
  let year = "";
  let month = "";
  let day = "";

  for (const part of parts) {
    if (part.type === "year") year = part.value;
    else if (part.type === "month") month = part.value;
    else if (part.type === "day") day = part.value;
  }

  return `${year}-${month}-${day}`;
};

/**
 * Integer day number for a "YYYY-MM-DD" key.
 *
 * Computed in UTC so it is a pure calendar counter: consecutive keys are
 * always exactly 1 apart, whatever the daylight-saving rules say.
 *
 * @param {string} key
 * @returns {number}
 */
const dayIndex = (key) => {
  const [year, month, day] = String(key).split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
};

/**
 * Integer day number for an instant, in the given zone.
 *
 * @param {Date|string|number} date
 * @param {string|null} [timeZone]
 * @returns {number}
 */
const dayIndexOf = (date, timeZone = null) => dayIndex(dayKey(date, timeZone));

/**
 * "YYYY-MM-DD" for an integer day number.
 *
 * @param {number} index
 * @returns {string}
 */
const keyFromDayIndex = (index) => {
  const date = new Date(index * MS_PER_DAY);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Monday-based week start for a day number.
 *
 * @param {number} index
 * @returns {number} the day number of that week's Monday
 */
const startOfWeekIndex = (index) => {
  const dayOfWeek = new Date(index * MS_PER_DAY).getUTCDay(); // 0 = Sunday
  return index - ((dayOfWeek + 6) % 7); // Monday = 0
};

module.exports = {
  dayIndex,
  dayIndexOf,
  dayKey,
  keyFromDayIndex,
  resolveTimeZone,
  startOfWeekIndex,
};
