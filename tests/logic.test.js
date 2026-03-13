import assert from "node:assert/strict";
import {
  computeHasNew,
  filterNotifications,
  selectActiveBanner,
  selectImportantNotification
} from "../src/logic.js";

const now = new Date("2026-03-11T10:00:00Z");

const notifications = [
  {
    id: "n1",
    title: "A",
    text: "T",
    important: false,
    audience: "all",
    userIds: [],
    contours: { in: true, out: false },
    createdAt: "2026-03-10T09:00:00Z",
    startAt: "2026-03-10T00:00:00Z",
    endAt: "2026-03-12T00:00:00Z"
  },
  {
    id: "n2",
    title: "B",
    text: "T",
    important: true,
    audience: "selected",
    userIds: ["u1"],
    contours: { in: true, out: true },
    createdAt: "2026-03-11T09:30:00Z",
    startAt: "2026-03-10T00:00:00Z",
    endAt: "2026-03-12T00:00:00Z"
  }
];

const banners = [
  {
    id: "b1",
    title: "Default",
    text: "T",
    enabled: true,
    isDefault: true,
    createdAt: "2026-03-01T10:00:00Z"
  },
  {
    id: "b2",
    title: "Timed",
    text: "T",
    enabled: true,
    isDefault: false,
    createdAt: "2026-03-10T10:00:00Z",
    startAt: "2026-03-11T00:00:00Z",
    endAt: "2026-03-12T00:00:00Z"
  }
];

const filtered = filterNotifications(notifications, "u1", "in", now);
assert.equal(filtered.length, 2);
assert.equal(filtered[0].id, "n2");

const hasNew = computeHasNew(filtered, "2026-03-11T00:00:00Z");
assert.equal(hasNew, true);

const important = selectImportantNotification(notifications, [], "u1", "in", now);
assert.equal(important.id, "n2");

const importantDismissed = selectImportantNotification(
  notifications,
  ["n2"],
  "u1",
  "in",
  now
);
assert.equal(importantDismissed, null);

const activeBanner = selectActiveBanner(banners, now);
assert.equal(activeBanner.id, "b2");

const fallbackBanner = selectActiveBanner(
  banners.map((banner) => ({ ...banner, startAt: "2026-03-01T00:00:00Z", endAt: "2026-03-02T00:00:00Z" })),
  now
);
assert.equal(fallbackBanner.id, "b1");

console.log("All tests passed");
