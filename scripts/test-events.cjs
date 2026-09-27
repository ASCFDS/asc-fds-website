const assert = require("node:assert/strict");
require("../assets/js/event-model.js");
const m = globalThis.ASCEvents;
const row = (title, startDate, endDate = startDate, hasTime = false) => ({
  title,
  startDate,
  endDate,
  hasTime,
});
const now = new Date("2026-09-27T12:00:00Z");
let result = m.split(
  [
    row("past", "2026-09-26"),
    row("today", "2026-09-27"),
    row("future", "2026-10-01"),
    row("multi", "2026-09-25", "2026-09-28"),
  ],
  now,
);
assert.deepEqual(
  result.upcoming.map((e) => e.title),
  ["multi", "today", "future"],
);
assert.equal(result.past[0].title, "past");
assert.equal(
  m.split(
    [row("expired time", "2026-09-27T09:00:00Z", "2026-09-27T10:00:00Z", true)],
    now,
  ).past.length,
  1,
);
assert.equal(
  m.split([row("Berlin day", "2026-09-28")], new Date("2026-09-27T22:30:00Z"))
    .upcoming.length,
  1,
);
assert.equal(
  m.split([row("DST", "2026-10-25")], new Date("2026-10-25T22:59:00Z")).upcoming
    .length,
  1,
);
assert.equal(m.normalize(row("invalid", "not a date")), null);
assert.equal(
  m.normalize({ ...row("private", "2026-10-01"), visibility: "private" }),
  null,
);
assert.equal(
  m.normalize({ ...row("cancelled", "2026-10-01"), status: "cancelled" }),
  null,
);
assert.equal(m.normalize(row("reversed", "2026-10-02", "2026-10-01")), null);
assert.equal(
  m.merge([row("Duplicate", "2026-10-01")], [row("Duplicate", "2026-10-01")])
    .length,
  1,
);
assert.equal(
  m.normalize(row("timestamp", { seconds: 1790812800 })).startDate,
  "2026-10-01T00:00:00.000Z",
);
console.log("11 event model regression checks passed");
