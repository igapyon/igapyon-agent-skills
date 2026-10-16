import assert from "node:assert/strict";
import test from "node:test";

import {
  dateFromJstParts,
  jstDashedTimestamp,
  jstDateParts,
  jstTimestamp,
} from "../scripts/miku-scm-jst-time.mjs";

test("JST timestamp formatting is independent of the host timezone", () => {
  const instant = new Date("2026-07-27T13:46:00Z");
  assert.deepEqual(jstDateParts(instant), {
    year: 2026,
    month: 7,
    day: 27,
    hour: 22,
    minute: 46,
  });
  assert.equal(jstTimestamp(instant), "202607272246");
  assert.equal(jstDashedTimestamp(instant), "2026-07-27-2246");
});

test("JST backup timestamps parse as their exact UTC instant", () => {
  assert.equal(
    dateFromJstParts({ year: 2026, month: 7, day: 27, hour: 12, minute: 30 }).toISOString(),
    "2026-07-27T03:30:00.000Z",
  );
  assert.equal(dateFromJstParts({ year: 2026, month: 2, day: 30, hour: 12, minute: 30 }), null);
});
