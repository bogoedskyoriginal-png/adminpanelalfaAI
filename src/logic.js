export function isWithinPeriod(item, now = new Date()) {
  const start = item.startAt ? new Date(item.startAt) : null;
  const end = item.endAt ? new Date(item.endAt) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

export function matchesAudience(item, userId) {
  if (item.audience === "all") return true;
  if (!userId) return false;
  return Array.isArray(item.userIds) && item.userIds.includes(userId);
}

export function matchesContour(item, contour) {
  if (!item.contours) return true;
  const { in: inContour, out: outContour } = item.contours;
  if (inContour && outContour) return true;
  if (contour === "in") return !!inContour;
  if (contour === "out") return !!outContour;
  return false;
}

export function filterNotifications(notifications, userId, contour, now = new Date()) {
  return notifications
    .filter((item) => isWithinPeriod(item, now))
    .filter((item) => matchesAudience(item, userId))
    .filter((item) => matchesContour(item, contour))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function selectImportantNotification(notifications, dismissedIds, userId, contour, now = new Date()) {
  const active = filterNotifications(notifications, userId, contour, now).filter(
    (item) => item.important
  );
  const candidate = active.find((item) => !dismissedIds.includes(item.id));
  return candidate || null;
}

export function selectActiveBanner(banners, now = new Date()) {
  const active = banners
    .filter((banner) => banner.enabled)
    .filter((banner) => isWithinPeriod(banner, now))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (active.length > 0) return active[0];
  const fallback = banners.find((banner) => banner.isDefault);
  return fallback || null;
}

export function computeHasNew(notifications, lastOpenedAt) {
  if (!lastOpenedAt) return notifications.length > 0;
  const last = new Date(lastOpenedAt);
  return notifications.some((item) => new Date(item.createdAt) > last);
}
