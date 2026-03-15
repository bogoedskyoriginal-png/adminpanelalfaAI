function isWithinPeriod(item, now = new Date()) {
  const start = item.startAt ? new Date(item.startAt) : null;
  const end = item.endAt ? new Date(item.endAt) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function matchesAudience(item, userId) {
  if (item.audience === "all") return true;
  if (!userId) return false;
  return Array.isArray(item.userIds) && item.userIds.includes(userId);
}

function matchesContour(item, contour) {
  if (!item.contours) return true;
  const { in: inContour, out: outContour } = item.contours;
  if (inContour && outContour) return true;
  if (contour === "in") return !!inContour;
  if (contour === "out") return !!outContour;
  return false;
}

function filterNotifications(notifications, userId, contour, now = new Date()) {
  return notifications
    .filter((item) => isWithinPeriod(item, now))
    .filter((item) => matchesAudience(item, userId))
    .filter((item) => matchesContour(item, contour))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function selectImportantNotification(notifications, dismissedIds, userId, contour, now = new Date()) {
  const active = filterNotifications(notifications, userId, contour, now).filter(
    (item) => item.important
  );
  const candidate = active.find((item) => !dismissedIds.includes(item.id));
  return candidate || null;
}

function selectActiveBanner(banners, now = new Date()) {
  const active = banners
    .filter((banner) => banner.enabled)
    .filter((banner) => isWithinPeriod(banner, now))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (active.length > 0) return active[0];
  const fallback = banners.find((banner) => banner.isDefault);
  return fallback || null;
}

function computeHasNew(notifications, lastOpenedAt) {
  if (!lastOpenedAt) return notifications.length > 0;
  const last = new Date(lastOpenedAt);
  return notifications.some((item) => new Date(item.createdAt) > last);
}

const storageKey = "alfa-ai-demo-state";
const nowIso = new Date().toISOString();

const defaultState = {
  stateVersion: 5,
  users: ["u100", "u200"],
  notifications: [],
  banners: [],
  readByUser: {},
  lastOpenedByUser: {},
  dismissedImportantByUser: {},
  assistants: []
};
let state = loadState();
state = ensureAssistants(state);
state = normalizeAssistantsAvatars(state);
state = ensureBanners(state);
state = clearLegacyNotifications(state);
let currentUser = {
  id: "u100",
  contour: "in"
};

const assistantModeKey = "alfa-ai-assistants-mode";
const assistantPageKey = "alfa-ai-assistants-page-size";

let assistantListMode = getAssistantListMode();
let assistantPageSize = getAssistantPageSize();
let openAssistantMenuId = null;
let pageSizeMenuOpen = false;

const tabUser = document.getElementById("tab-user");
const tabAdmin = document.getElementById("tab-admin");
const userPanel = document.getElementById("user-panel");
const adminPanel = document.getElementById("admin-panel");
const adminTabNotifications = document.getElementById("admin-tab-notifications");
const adminTabBanner = document.getElementById("admin-tab-banner");
const adminTabAssistants = document.getElementById("admin-tab-assistants");
const adminNotifications = document.getElementById("admin-notifications");
const adminBanner = document.getElementById("admin-banner");
const adminAssistants = document.getElementById("admin-assistants");

const userIdInput = document.getElementById("user-id-input");
const contourSelect = document.getElementById("user-contour-select");
const enterButton = document.getElementById("enter-alfa-ai");
const logoutButton = document.getElementById("logout-alfa-ai");
const sessionBadge = document.getElementById("session-badge");
const simulateErrorToggle = document.getElementById("simulate-error");
const notificationsButton = document.getElementById("notifications-button");
const indicator = document.getElementById("notifications-indicator");
const center = document.getElementById("notifications-center");
const centerBody = document.getElementById("center-body");
const closeCenter = document.getElementById("close-center");

const bannerContainer = document.getElementById("banner-container");
const bannerTitle = document.getElementById("banner-title");
const bannerText = document.getElementById("banner-text");
const bannerCta = document.getElementById("banner-cta");
const bannerImage = document.getElementById("banner-image");

const notificationsList = document.getElementById("notifications-list");
const bannersList = document.getElementById("banners-list");
const createNotificationButton = document.getElementById("create-notification");
const createBannerButton = document.getElementById("create-banner");
const createAssistantButton = document.getElementById("create-assistant");
const assistantFilterUser = document.getElementById("assistant-filter-user");
const assistantFilterSystem = document.getElementById("assistant-filter-system");
const assistantsList = document.getElementById("assistants-list");
const assistantsCount = document.getElementById("assistants-count");
const pageSizeButton = document.getElementById("page-size-button");
const pageSizeMenu = document.getElementById("page-size-menu");

const modalRoot = document.getElementById("modal-root");
const toastRoot = document.getElementById("toast-root");
const userAssistantsList = document.getElementById("user-assistants");

const statsBackdrop = document.getElementById("stats-backdrop");
const statsClose = document.getElementById("statsClose");
const statsTitle = document.getElementById("statsTitle");
const statsSubtitle = document.getElementById("statsSubtitle");
const statsMetricList = document.getElementById("statsMetricList");
const statsMetricTitle = document.getElementById("statsMetricTitle");
const statsMetricDescription = document.getElementById("statsMetricDescription");
const statsChart = document.getElementById("statsChart");
const statsTooltip = document.getElementById("statsTooltip");
const statsAxisNote = document.getElementById("statsAxisNote");
const statsCustomRange = document.getElementById("statsCustomRange");
const statsCustomStart = document.getElementById("statsCustomStart");
const statsCustomEnd = document.getElementById("statsCustomEnd");
const statsCustomHint = document.getElementById("statsCustomHint");
const statsDownloadBtn = document.getElementById("statsDownloadBtn");
const statsAvailability = document.getElementById("statsAvailability");
const statsAvailabilityDate = document.getElementById("statsAvailabilityDate");
const statsChartToggle = document.querySelector(".stats-chart-toggle");

const competenceOptions = ["Smarty", "Android", "Data", "Design"];
const modelOptions = [
  { type: "core", label: "Alfa GPT-XL" },
  { type: "core", label: "Alfa GPT-Mini" },
  { type: "search", label: "Alfa Search Pro" },
  { type: "search", label: "Alfa Search Lite" },
  { type: "guard", label: "Alfa Guard" }
];
const avatarPresets = [
  { color: "#e59aa5", initials: "AI" },
  { color: "#6b4b3b", initials: "AL" },
  { color: "#5d7aa5", initials: "UP" },
  { color: "#3c6b8b", initials: "GO" }
];

init();

function init() {
  userIdInput.value = currentUser.id;
  contourSelect.value = currentUser.contour;
  enterButton.addEventListener("click", handleEnter);
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }
  notificationsButton.addEventListener("click", toggleCenter);
  closeCenter.addEventListener("click", hideCenter);
  createNotificationButton.addEventListener("click", openNotificationModal);
  createBannerButton.addEventListener("click", openBannerModal);
  bannerCta.addEventListener("click", handleBannerClick);
  tabUser.addEventListener("click", () => switchMainTab("user"));
  tabAdmin.addEventListener("click", () => switchMainTab("admin"));
  if (adminTabNotifications) {
    adminTabNotifications.addEventListener("click", () => switchAdminTab("notifications"));
  }
  if (adminTabBanner) {
    adminTabBanner.addEventListener("click", () => switchAdminTab("banner"));
  }
  if (adminTabAssistants) {
    adminTabAssistants.addEventListener("click", () => switchAdminTab("assistants"));
  }
  if (createAssistantButton) {
    createAssistantButton.addEventListener("click", () => openAssistantModal("create"));
  }
  if (assistantFilterUser) {
    assistantFilterUser.addEventListener("click", () => handleAssistantFilter("user"));
  }
  if (assistantFilterSystem) {
    assistantFilterSystem.addEventListener("click", () => handleAssistantFilter("system"));
  }
  if (pageSizeButton) {
    pageSizeButton.addEventListener("click", togglePageSizeMenu);
  }
  if (pageSizeMenu) {
    pageSizeMenu.addEventListener("click", handlePageSizeSelect);
  }
  document.addEventListener("click", handleGlobalClick);
  if (statsClose) {
    statsClose.addEventListener("click", closeStatsModal);
  }
  if (statsBackdrop) {
    statsBackdrop.addEventListener("click", (event) => {
      if (event.target === statsBackdrop) closeStatsModal();
    });
  }
  if (statsMetricList) {
    statsMetricList.addEventListener("click", handleStatsMetricClick);
  }
  if (statsCustomStart) {
    statsCustomStart.addEventListener("change", handleStatsCustomRange);
  }
  if (statsCustomEnd) {
    statsCustomEnd.addEventListener("change", handleStatsCustomRange);
  }
  if (statsDownloadBtn) {
    statsDownloadBtn.addEventListener("click", downloadStatsCsv);
  }
  if (statsChart) {
    statsChart.addEventListener("mousemove", handleStatsTooltip);
    statsChart.addEventListener("mouseleave", hideStatsTooltip);
  }
  if (statsChartToggle) {
    statsChartToggle.addEventListener("click", handleStatsChartToggle);
  }
  document.querySelectorAll(".stats-pill").forEach((pill) => {
    pill.addEventListener("click", () => setStatsPeriod(pill.dataset.period));
  });

  renderAdmin();
  refreshUserView();
  maybeShowImportantModal();
}

function switchMainTab(tab) {
  const isUser = tab === "user";
  tabUser.classList.toggle("active", isUser);
  tabAdmin.classList.toggle("active", !isUser);
  userPanel.classList.toggle("hidden", !isUser);
  adminPanel.classList.toggle("hidden", isUser);
}

function switchAdminTab(tab) {
  const isNotifications = tab === "notifications";
  const isBanner = tab === "banner";
  const isAssistants = tab === "assistants";
  adminTabNotifications.classList.toggle("active", isNotifications);
  adminTabBanner.classList.toggle("active", isBanner);
  adminTabAssistants.classList.toggle("active", isAssistants);
  adminNotifications.classList.toggle("hidden", !isNotifications);
  adminBanner.classList.toggle("hidden", !isBanner);
  adminAssistants.classList.toggle("hidden", !isAssistants);
}

function normalizeState(raw) {
  const base = structuredClone(defaultState);
  if (!raw || typeof raw !== "object") return base;
  const merged = {
    ...base,
    ...raw
  };
  if (!Array.isArray(raw.assistants) || raw.assistants.length === 0) {
    merged.assistants = base.assistants;
  }
  return merged;
}

function loadState() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return structuredClone(defaultState);
  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function buildAssistantSeed() {
  return [
    {
      id: "assistant-user-1",
      name: "Навигатор по отпускам",
      userId: "u100",
      isPublic: true,
      isSystem: false,
      competence: "Smarty",
      model: "Alfa GPT-XL",
      modelType: "core",
      description: "Отвечает на вопросы по правилам отпусков и помогает со статусами.",
      prompt: "Ты консультируешь сотрудников по отпускным правилам и графикам.",
      author: "u100",
      authorType: "USER",
      usesFlow: false,
      flowKey: "",
      files: [
        { id: "file-1", name: "Политика_отпусков.pdf", size: "1.2 МБ", type: "PDF" }
      ],
      avatar: { kind: "color", value: "#e59aa5", initials: "НО" },
      stats: { chats: 184, users: 72, lastUsed: "2026-03-11" },
      createdAt: "2026-01-10T09:00:00.000Z"
    },
    {
      id: "assistant-user-2",
      name: "Финансовый радар",
      userId: "u200",
      isPublic: true,
      isSystem: false,
      competence: "Smarty",
      model: "Alfa Search Pro",
      modelType: "search",
      description: "Сводит отчеты, KPI и проверяет бюджетные сценарии.",
      prompt: "Ты помощник финансового аналитика. Говори кратко и по делу.",
      author: "u200",
      authorType: "USER",
      usesFlow: true,
      flowKey: "FLOW-FIN-219",
      files: [
        { id: "file-2", name: "KPI_2026.xlsx", size: "820 КБ", type: "XLSX" }
      ],
      avatar: { kind: "color", value: "#b96f7a", initials: "ФР" },
      stats: { chats: 96, users: 41, lastUsed: "2026-03-12" },
      createdAt: "2026-02-18T11:15:00.000Z"
    },
    {
      id: "assistant-user-3",
      name: "HR-конструктор",
      userId: "u100",
      isPublic: true,
      isSystem: false,
      competence: "Smarty",
      model: "Alfa GPT-Mini",
      modelType: "core",
      description: "Собирает шаблоны писем, приказов и кадровых форм.",
      prompt: "Ты помогаешь с кадровыми документами и корректными формулировками.",
      author: "u100",
      authorType: "USER",
      usesFlow: false,
      flowKey: "",
      files: [
        { id: "file-3", name: "Шаблоны_HR.docx", size: "640 КБ", type: "DOCX" }
      ],
      avatar: { kind: "color", value: "#a55d8e", initials: "HR" },
      stats: { chats: 58, users: 26, lastUsed: "2026-03-08" },
      createdAt: "2026-03-10T13:30:00.000Z"
    },
    {
      id: "assistant-user-4",
      name: "Оркестратор встреч",
      userId: "u200",
      isPublic: true,
      isSystem: false,
      competence: "Smarty",
      model: "Alfa GPT-XL",
      modelType: "core",
      description: "Собирает повестки, резюме встреч и договоренности.",
      prompt: "Ты формируешь повестки и фиксируешь итоги встреч.",
      author: "u200",
      authorType: "USER",
      usesFlow: true,
      flowKey: "FLOW-MEET-774",
      files: [],
      avatar: { kind: "color", value: "#d2785d", initials: "ОВ" },
      stats: { chats: 210, users: 88, lastUsed: "2026-03-09" },
      createdAt: "2026-01-25T08:45:00.000Z"
    },
    {
      id: "assistant-system-1",
      name: "Compliance Guardian",
      userId: "admin",
      isPublic: true,
      isSystem: true,
      competence: "Smarty",
      model: "Alfa Guard",
      modelType: "guard",
      description: "Проверяет ответы на соответствие политикам и регламентам.",
      prompt: "Системный промпт. Изменения запрещены.",
      author: "admin",
      authorType: "ADMIN",
      usesFlow: false,
      flowKey: "",
      files: [{ id: "file-4", name: "Policy_2026.pdf", size: "2.4 МБ", type: "PDF" }],
      avatar: { kind: "color", value: "#5d7aa5", initials: "CG" },
      stats: { chats: 640, users: 302, lastUsed: "2026-03-12" },
      createdAt: "2026-01-05T10:00:00.000Z"
    },
    {
      id: "assistant-system-2",
      name: "Инцидент-координатор",
      userId: "admin",
      isPublic: true,
      isSystem: true,
      competence: "Smarty",
      model: "Alfa Search Pro",
      modelType: "search",
      description: "Запускает процессы реагирования и помогает с регламентом.",
      prompt: "Системный промпт. Изменения запрещены.",
      author: "admin",
      authorType: "ADMIN",
      usesFlow: true,
      flowKey: "FLOW-INC-355",
      files: [],
      avatar: { kind: "color", value: "#3c6b8b", initials: "ИК" },
      stats: { chats: 402, users: 180, lastUsed: "2026-03-10" },
      createdAt: "2026-02-15T10:00:00.000Z"
    },
    {
      id: "assistant-system-3",
      name: "Политика доступа",
      userId: "admin",
      isPublic: true,
      isSystem: true,
      competence: "Smarty",
      model: "Alfa GPT-Mini",
      modelType: "core",
      description: "Консультирует по доступам, ролям и заявкам.",
      prompt: "Системный промпт. Изменения запрещены.",
      author: "admin",
      authorType: "ADMIN",
      usesFlow: false,
      flowKey: "",
      files: [],
      avatar: { kind: "color", value: "#6b4b3b", initials: "ПД" },
      stats: { chats: 120, users: 64, lastUsed: "2026-03-07" },
      createdAt: "2026-03-11T10:00:00.000Z"
    }
  ];
}

function hasBrokenText(value) {
  if (typeof value !== "string") return false;
  return value.includes("\\ufffd") || value.includes("\\u") || value.includes("\ufffd");
}

function assistantsNeedReset(list) {
  if (!Array.isArray(list) || list.length === 0) return true;
  return list.some(
    (assistant) =>
      hasBrokenText(assistant.name) ||
      hasBrokenText(assistant.description) ||
      hasBrokenText(assistant.prompt) ||
      !assistant.avatar ||
      (assistant.avatar.kind === "image" && !assistant.avatar.value) ||
      (assistant.avatar.kind === "color" && !assistant.avatar.value)
  );
}

function ensureAssistants(data) {
  const seed = buildAssistantSeed();
  if (data.stateVersion !== defaultState.stateVersion || assistantsNeedReset(data.assistants)) {
    data.assistants = seed;
  }
  data.stateVersion = defaultState.stateVersion;
  saveState();
  return data;
}

function normalizeAssistantsAvatars(data) {
  let changed = false;
  data.assistants = data.assistants.map((assistant) => {
    if (assistant.avatar && assistant.avatar.value) return assistant;
    changed = true;
    return {
      ...assistant,
      avatar: {
        kind: "color",
        value: "#e59aa5",
        initials: getInitials(assistant.name || "AI")
      }
    };
  });
  if (changed) saveState();
  return data;
}

function buildDefaultBanner() {
  return {
    id: "banner-default",
    title: "Alfa AI помогает решать рабочие задачи",
    text: "Создайте собственного ассистента и упростите рутину",
    ctaText: "Создать ассистента",
    link: "https://example.com/create",
    image: "",
    startAt: null,
    endAt: null,
    enabled: true,
    isDefault: true,
    createdAt: nowIso
  };
}

function bannersNeedReset(list) {
  if (!Array.isArray(list) || list.length === 0) return true;
  return list.some(
    (banner) =>
      hasBrokenText(banner.title) ||
      hasBrokenText(banner.text) ||
      hasBrokenText(banner.ctaText)
  );
}

function ensureBanners(data) {
  if (bannersNeedReset(data.banners)) {
    data.banners = [buildDefaultBanner()];
    saveState();
  }
  return data;
}

function clearLegacyNotifications(data) {
  const key = "alfa-ai-clear-notifications-v1";
  if (!localStorage.getItem(key)) {
    data.notifications = [];
    data.lastOpenedByUser = {};
    data.readByUser = {};
    data.dismissedImportantByUser = {};
    localStorage.setItem(key, "done");
    saveState();
  }
  return data;
}

function getAssistantListMode() {
  const value = sessionStorage.getItem(assistantModeKey);
  return value === "system" ? "system" : "user";
}

function setAssistantListMode(mode) {
  assistantListMode = mode;
  sessionStorage.setItem(assistantModeKey, mode);
}

function getAssistantPageSize() {
  const value = Number.parseInt(sessionStorage.getItem(assistantPageKey), 10);
  if (Number.isFinite(value)) return value;
  return 25;
}

function setAssistantPageSize(size) {
  assistantPageSize = size;
  sessionStorage.setItem(assistantPageKey, String(size));
}

function handleEnter() {
  currentUser = {
    id: userIdInput.value.trim(),
    contour: contourSelect.value
  };
  updateSessionBadge();
  refreshUserView();
  maybeShowImportantModal();
}

function handleLogout() {
  currentUser = {
    id: "",
    contour: contourSelect.value
  };
  userIdInput.value = "";
  updateSessionBadge();
  refreshUserView();
}

function updateSessionBadge() {
  if (!sessionBadge) return;
  if (currentUser.id) {
    sessionBadge.textContent = `Вы вошли как: ${currentUser.id}`;
  } else {
    sessionBadge.textContent = "Не авторизован";
  }
}

function refreshUserView() {
  const activeNotifications = filterNotifications(
    state.notifications,
    currentUser.id,
    currentUser.contour
  );
  const hasNew = computeHasNew(
    activeNotifications,
    state.lastOpenedByUser[currentUser.id]
  );
  indicator.classList.toggle("hidden", !hasNew);
  renderCenter(activeNotifications, false);
  renderBanner();
  renderUserAssistants();
  updateSessionBadge();
}

function toggleCenter() {
  if (!center.classList.contains("hidden")) {
    hideCenter();
    return;
  }
  const activeNotifications = filterNotifications(
    state.notifications,
    currentUser.id,
    currentUser.contour
  );
  renderCenter(activeNotifications, true);
  center.classList.remove("hidden");
  state.lastOpenedByUser[currentUser.id] = new Date().toISOString();
  saveState();
  indicator.classList.add("hidden");
}

function hideCenter() {
  center.classList.add("hidden");
}

function renderCenter(notifications, opening) {
  centerBody.innerHTML = "";

  if (simulateErrorToggle.checked && opening) {
    const error = document.createElement("div");
    error.className = "state";
    error.innerHTML = "Ошибка загрузки уведомлений.";
    const retry = document.createElement("button");
    retry.className = "ghost";
    retry.textContent = "Повторить";
    retry.addEventListener("click", () => {
      simulateErrorToggle.checked = false;
      toggleCenter();
      toggleCenter();
    });
    error.appendChild(retry);
    centerBody.appendChild(error);
    return;
  }

  if (notifications.length === 0) {
    const empty = document.createElement("div");
    empty.className = "state";
    empty.textContent = "Нет уведомлений";
    centerBody.appendChild(empty);
    return;
  }

  notifications.forEach((item) => {
    const card = document.createElement("div");
    card.className = "notice";
    const title = document.createElement("h4");
    title.textContent = item.title;
    const text = document.createElement("p");
    text.textContent = item.text;
    const meta = document.createElement("div");
    meta.className = "meta";
    const badge = document.createElement("span");
    badge.className = item.important ? "badge important" : "badge";
    badge.textContent = item.important ? "Важное" : "Обычное";
    const status = document.createElement("span");
    const readSet = getReadSet(currentUser.id);
    const isNew = !readSet.has(item.id);
    status.textContent = isNew ? "Новое" : "Прочитано";
    meta.appendChild(badge);
    meta.appendChild(status);

    card.appendChild(title);
    card.appendChild(text);
    card.appendChild(meta);
    card.addEventListener("click", () => handleNotificationClick(item));
    centerBody.appendChild(card);
  });
}

function handleNotificationClick(item) {
  markAsRead(item.id);
  refreshUserView();
  if (item.link) {
    window.open(item.link, "_blank");
  }
}

function markAsRead(notificationId) {
  const readSet = getReadSet(currentUser.id);
  if (!readSet.has(notificationId)) {
    readSet.add(notificationId);
    state.readByUser[currentUser.id] = Array.from(readSet);
    saveState();
  }
}

function getReadSet(userId) {
  const items = state.readByUser[userId] || [];
  return new Set(items);
}

function maybeShowImportantModal() {
  const dismissed = state.dismissedImportantByUser[currentUser.id] || [];
  const important = selectImportantNotification(
    state.notifications,
    dismissed,
    currentUser.id,
    currentUser.contour
  );
  if (!important) return;
  openImportantModal(important);
}

function openImportantModal(item) {
  const modal = buildModal({
    title: item.title,
    body: () => {
      const wrapper = document.createElement("div");
      wrapper.className = "modal-body";
      const text = document.createElement("p");
      text.textContent = item.text;
      wrapper.appendChild(text);
      return wrapper;
    },
    footer: (close) => {
      const action = document.createElement("button");
      action.className = "primary";
      action.textContent = item.ctaText || "Ознакомился";
      action.addEventListener("click", () => {
        if (item.link) window.open(item.link, "_blank");
        close();
      });
      return [action];
    },
    onClose: () => {
      markAsRead(item.id);
      dismissImportant(item.id);
      refreshUserView();
    }
  });
  modalRoot.appendChild(modal);
}

function dismissImportant(notificationId) {
  const list = state.dismissedImportantByUser[currentUser.id] || [];
  if (!list.includes(notificationId)) {
    list.push(notificationId);
    state.dismissedImportantByUser[currentUser.id] = list;
    saveState();
  }
}

function renderAdmin() {
  renderAdminNotifications();
  renderAdminBanners();
  renderAdminAssistants();
}

function renderAdminNotifications() {
  notificationsList.innerHTML = "";
  if (state.notifications.length === 0) {
    const empty = document.createElement("li");
    empty.className = "list-item";
    empty.textContent = "Уведомлений пока нет";
    notificationsList.appendChild(empty);
    return;
  }

  state.notifications
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((notification) => {
      const item = document.createElement("li");
      item.className = "list-item";
      item.innerHTML = `<strong>${notification.title}</strong>
        <span>${notification.text}</span>
        <span class="muted">${notification.important ? "Важное" : "Обычное"}</span>`;
      notificationsList.appendChild(item);
    });
}

function renderAdminBanners() {
  bannersList.innerHTML = "";
  if (state.banners.length === 0) {
    const empty = document.createElement("li");
    empty.className = "list-item";
    empty.textContent = "Баннеров пока нет";
    bannersList.appendChild(empty);
    return;
  }

  state.banners
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((banner) => {
      const item = document.createElement("li");
      item.className = "list-item";
      item.innerHTML = `<strong>${banner.title}</strong>
        <span>${banner.text}</span>
        <span class="muted">${banner.enabled ? "Включен" : "Выключен"} · ${
        banner.isDefault ? "По умолчанию" : ""
      }</span>`;
      const actions = document.createElement("div");
      actions.className = "actions";
      const makeDefault = document.createElement("button");
      makeDefault.className = "ghost";
      makeDefault.textContent = "Сделать по умолчанию";
      makeDefault.addEventListener("click", () => {
        state.banners.forEach((b) => {
          b.isDefault = b.id === banner.id;
        });
        saveState();
        renderAdminBanners();
        refreshUserView();
      });
      actions.appendChild(makeDefault);
      item.appendChild(actions);
      bannersList.appendChild(item);
    });
}

function isAssistantVisibleToUser(assistant, userId) {
  if (assistant.competence !== "Smarty") return false;
  if (assistant.isPublic) return true;
  return assistant.userId === userId;
}

function renderUserAssistants() {
  userAssistantsList.innerHTML = "";
  const visible = state.assistants
    .filter((assistant) => isAssistantVisibleToUser(assistant, currentUser.id))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (visible.length === 0) {
    const empty = document.createElement("div");
    empty.className = "state";
    empty.textContent = "Нет доступных ассистентов.";
    userAssistantsList.appendChild(empty);
    return;
  }

  visible.forEach((assistant) => {
    const card = document.createElement("div");
    card.className = "assistant-card";

    const header = document.createElement("div");
    header.className = "assistant-header";

    const avatar = document.createElement("div");
    avatar.className = "assistant-avatar";
    if (assistant.avatar?.kind === "image") {
      const img = document.createElement("img");
      img.src = assistant.avatar.value;
      avatar.appendChild(img);
    } else {
      avatar.style.background = assistant.avatar?.value || "#e59aa5";
      avatar.textContent = assistant.avatar?.initials || getInitials(assistant.name || "AI");
    }

    const title = document.createElement("h4");
    title.textContent = assistant.name;

    header.appendChild(avatar);
    header.appendChild(title);

    const desc = document.createElement("p");
    desc.textContent = assistant.description;

    const tags = document.createElement("div");
    tags.className = "assistant-tags";
    const typeTag = document.createElement("span");
    typeTag.className = assistant.isSystem ? "tag system" : "tag";
    typeTag.textContent = assistant.isSystem ? "Системный" : "Пользовательский";
    const publicTag = document.createElement("span");
    publicTag.className = assistant.isPublic ? "tag" : "tag private";
    publicTag.textContent = assistant.isPublic ? "Публичный" : "Только вам";
    const ownerTag = document.createElement("span");
    ownerTag.className = "tag";
    ownerTag.textContent = `user_id ${assistant.userId}`;

    tags.appendChild(typeTag);
    tags.appendChild(publicTag);
    tags.appendChild(ownerTag);

    card.appendChild(header);
    card.appendChild(desc);
    card.appendChild(tags);
    userAssistantsList.appendChild(card);
  });
}

function handleAssistantFilter(mode) {
  setAssistantListMode(mode);
  openAssistantMenuId = null;
  renderAdminAssistants();
}

function togglePageSizeMenu(event) {
  event.stopPropagation();
  pageSizeMenuOpen = !pageSizeMenuOpen;
  pageSizeMenu.classList.toggle("hidden", !pageSizeMenuOpen);
}

function handlePageSizeSelect(event) {
  const button = event.target.closest("button[data-size]");
  if (!button) return;
  const size = Number.parseInt(button.dataset.size, 10);
  setAssistantPageSize(size);
  pageSizeMenuOpen = false;
  pageSizeMenu.classList.add("hidden");
  renderAdminAssistants();
}

function handleGlobalClick(event) {
  if (pageSizeMenuOpen && !event.target.closest(".page-size")) {
    pageSizeMenuOpen = false;
    pageSizeMenu.classList.add("hidden");
  }
  if (
    openAssistantMenuId &&
    !event.target.closest(".assistant-menu") &&
    !event.target.closest(".menu-button")
  ) {
    openAssistantMenuId = null;
    renderAdminAssistants();
  }
}

function toggleAssistantMenu(id) {
  openAssistantMenuId = openAssistantMenuId === id ? null : id;
  renderAdminAssistants();
}

function renderAdminAssistants() {
  assistantsList.innerHTML = "";
  assistantFilterUser.classList.toggle("active", assistantListMode === "user");
  assistantFilterSystem.classList.toggle("active", assistantListMode === "system");
  pageSizeButton.textContent = `Показывать по ${assistantPageSize}`;

  const filtered = state.assistants.filter((assistant) =>
    assistantListMode === "system" ? assistant.isSystem : !assistant.isSystem
  );
  const total = filtered.length;
  const visible = filtered.slice(0, assistantPageSize);

  if (openAssistantMenuId && !visible.some((assistant) => assistant.id === openAssistantMenuId)) {
    openAssistantMenuId = null;
  }

  if (visible.length === 0) {
    const empty = document.createElement("div");
    empty.className = "state";
    empty.textContent = "Ассистентов пока нет.";
    assistantsList.appendChild(empty);
    assistantsCount.textContent = "Показано 0 из 0";
    return;
  }

  visible.forEach((assistant) => {
    const row = document.createElement("div");
    row.className = "assistant-row";

    const nameCell = document.createElement("div");
    const name = document.createElement("div");
    name.className = "assistant-name";
    name.title = assistant.name;
    name.textContent = assistant.name;
    const desc = document.createElement("div");
    desc.className = "assistant-meta";
    desc.textContent = assistant.description;
    nameCell.appendChild(name);
    nameCell.appendChild(desc);

    const userCell = document.createElement("div");
    userCell.innerHTML = `<div class="assistant-meta">user_id</div><div>${assistant.userId}</div>`;

    const statusCell = document.createElement("div");
    const status = document.createElement("span");
    status.className = assistant.isPublic ? "status-pill" : "status-pill off";
    status.textContent = assistant.isPublic ? "Публичное" : "Скрытое";
    statusCell.appendChild(status);

    const actionCell = document.createElement("div");
    const menuButton = document.createElement("button");
    menuButton.className = "menu-button";
    menuButton.textContent = "⋮";
    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleAssistantMenu(assistant.id);
    });
    actionCell.appendChild(menuButton);

    row.appendChild(nameCell);
    row.appendChild(userCell);
    row.appendChild(statusCell);
    row.appendChild(actionCell);

    if (openAssistantMenuId === assistant.id) {
      const menu = document.createElement("div");
      menu.className = "assistant-menu";
      const editButton = document.createElement("button");
      editButton.textContent = "Редактировать";
      editButton.addEventListener("click", () => {
        openAssistantMenuId = null;
        renderAdminAssistants();
        openAssistantModal("edit", assistant);
      });
      const linkButton = document.createElement("button");
      linkButton.textContent = "Сгенерировать ссылку";
      linkButton.addEventListener("click", () => {
        openAssistantMenuId = null;
        renderAdminAssistants();
        generateAssistantLink(assistant);
      });
      const statsButton = document.createElement("button");
      statsButton.textContent = "Статистика";
      statsButton.addEventListener("click", () => {
        openAssistantMenuId = null;
        renderAdminAssistants();
        openStatsModal(assistant);
      });
      menu.appendChild(editButton);
      menu.appendChild(linkButton);
      menu.appendChild(statsButton);

      if (!assistant.isSystem) {
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Удалить";
        deleteButton.className = "danger";
        deleteButton.addEventListener("click", () => {
          openAssistantMenuId = null;
          renderAdminAssistants();
          openDeleteModal(assistant);
        });
        menu.appendChild(deleteButton);
      }

      row.appendChild(menu);
    }

    assistantsList.appendChild(row);
  });

  assistantsCount.textContent = `Показано ${visible.length} из ${total}`;
}

function renderBanner() {
  const banner = selectActiveBanner(state.banners);
  if (!banner) {
    bannerContainer.classList.add("hidden");
    return;
  }
  bannerContainer.classList.remove("hidden");
  bannerTitle.textContent = banner.title;
  bannerText.textContent = banner.text;
  bannerCta.textContent = banner.ctaText || "Подробнее";
  if (banner.image) {
    bannerImage.src = banner.image;
    bannerContainer.classList.add("has-image");
  } else {
    bannerImage.removeAttribute("src");
    bannerContainer.classList.remove("has-image");
  }
  bannerCta.dataset.link = banner.link || "";
}

function handleBannerClick() {
  const link = bannerCta.dataset.link;
  if (link) window.open(link, "_blank");
}

function getAssistantBase() {
  return {
    id: "",
    name: "",
    userId: "",
    isPublic: true,
    isSystem: false,
    competence: "Smarty",
    model: "Alfa GPT-XL",
    modelType: "core",
    description: "",
    prompt: "",
    author: "",
    authorType: "USER",
    usesFlow: false,
    flowKey: "",
    files: [],
    avatar: { kind: "color", value: "#e59aa5", initials: "AI" },
    stats: { chats: 0, users: 0, lastUsed: "-" },
    createdAt: new Date().toISOString()
  };
}

function createAssistantDraft() {
  return {
    ...getAssistantBase(),
    id: `assistant-${crypto.randomUUID()}`,
    userId: "admin",
    isSystem: true,
    author: "admin",
    authorType: "ADMIN"
  };
}

function normalizeAssistant(assistant) {
  return {
    ...getAssistantBase(),
    ...assistant,
    avatar: assistant.avatar || { kind: "color", value: "#e59aa5", initials: "AI" },
    files: Array.isArray(assistant.files) ? assistant.files : []
  };
}

function openAssistantModal(mode, assistant) {
  const isCreate = mode === "create";
  const draft = isCreate ? createAssistantDraft() : normalizeAssistant(assistant);
  let errorNode = null;
  const modal = buildModal({
    title: isCreate ? "Создание AI-ассистента" : "Редактировать AI-ассистента",
    className: "assistant-modal",
    footerOutside: true,
    body: () => {
      const wrapper = document.createElement("div");
      wrapper.className = "modal-body";

      const competenceSelect = document.createElement("select");
      competenceOptions.forEach((option) => {
        const item = document.createElement("option");
        item.value = option;
        item.textContent = option;
        if (option === draft.competence) item.selected = true;
        competenceSelect.appendChild(item);
      });
      competenceSelect.addEventListener("change", () => {
        draft.competence = competenceSelect.value;
      });

      const modelSelect = document.createElement("select");
      const availableModels = isCreate
        ? modelOptions
        : modelOptions.filter((model) => model.type === draft.modelType);
      availableModels.forEach((model) => {
        const item = document.createElement("option");
        item.value = model.label;
        item.textContent = model.label;
        if (model.label === draft.model) item.selected = true;
        modelSelect.appendChild(item);
      });
      modelSelect.addEventListener("change", () => {
        const selected = modelOptions.find((model) => model.label === modelSelect.value);
        if (selected) {
          draft.model = selected.label;
          draft.modelType = selected.type;
        }
      });

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.placeholder = "Название ассистента";
      nameInput.value = draft.name;
      nameInput.addEventListener("input", () => {
        draft.name = nameInput.value;
      });

      const descInput = document.createElement("textarea");
      descInput.placeholder = "Краткое описание";
      descInput.value = draft.description;
      descInput.addEventListener("input", () => {
        draft.description = descInput.value;
      });

      const promptInput = document.createElement("textarea");
      promptInput.placeholder = "Промпт";
      promptInput.value = draft.prompt;
      promptInput.disabled = draft.isSystem && !isCreate;
      promptInput.addEventListener("input", () => {
        draft.prompt = promptInput.value;
      });

      const competenceField = document.createElement("label");
      competenceField.className = "field in-field-label";
      competenceField.dataset.label = "Компетенция";
      competenceField.appendChild(competenceSelect);

      const modelField = document.createElement("label");
      modelField.className = "field in-field-label";
      modelField.dataset.label = "Модель";
      modelField.appendChild(modelSelect);

      const nameField = document.createElement("label");
      nameField.className = "field in-field-label";
      nameField.dataset.label = "Название ассистента";
      nameField.appendChild(nameInput);

      const descField = document.createElement("label");
      descField.className = "field in-field-label";
      descField.dataset.label = "Краткое описание";
      descField.appendChild(descInput);

      const promptField = document.createElement("label");
      promptField.className = "field in-field-label";
      promptField.dataset.label = "Промпт";
      promptField.appendChild(promptInput);

      const authorInput = document.createElement("input");
      authorInput.type = "text";
      authorInput.placeholder = "Автор ассистента";
      authorInput.value = draft.author;
      authorInput.disabled = draft.authorType === "ADMIN";
      authorInput.addEventListener("input", () => {
        draft.author = authorInput.value;
      });

      const authorTypeInput = document.createElement("input");
      authorTypeInput.type = "text";
      authorTypeInput.placeholder = "Тип автора";
      authorTypeInput.value = draft.authorType;
      authorTypeInput.disabled = true;

      const authorField = document.createElement("label");
      authorField.className = "field in-field-label";
      authorField.dataset.label = "Автор ассистента";
      authorField.appendChild(authorInput);
      const authorHint = document.createElement("div");
      authorHint.className = "hint";
      authorHint.textContent =
        "Автор промпта - Идентификатор пользователя, создавшего ассистента. Редактирование доступно только для пользовательских промптов.";

      const authorTypeField = document.createElement("label");
      authorTypeField.className = "field in-field-label";
      authorTypeField.dataset.label = "Тип автора";
      authorTypeField.appendChild(authorTypeInput);
      const authorTypeHint = document.createElement("div");
      authorTypeHint.className = "hint";
      authorTypeHint.textContent =
        "Тип автора - ADMIN системный промпт, USER пользовательский промпт.";

      const flowField = document.createElement("div");
      function renderFlowField() {
        flowField.innerHTML = "";
        if (!draft.usesFlow) return;
        const flowInput = document.createElement("input");
        flowInput.type = "text";
        flowInput.placeholder = "Ключ Flow";
        flowInput.value = draft.flowKey || "";
        flowInput.addEventListener("input", () => {
          draft.flowKey = flowInput.value;
        });
        const flowLabelField = document.createElement("label");
        flowLabelField.className = "field in-field-label";
        flowLabelField.dataset.label = "Ключ Flow";
        flowLabelField.appendChild(flowInput);
        flowField.appendChild(flowLabelField);
      }
      renderFlowField();

      const filesSection = document.createElement("div");
      filesSection.className = "modal-section";
      const filesTitle = document.createElement("strong");
      filesTitle.textContent = "Файлы";
      const filesList = document.createElement("div");
      filesList.className = "files-list";
      const uploadButton = document.createElement("button");
      uploadButton.className = "ghost";
      uploadButton.textContent = "Загрузить файл";
      const uploadInput = document.createElement("input");
      uploadInput.type = "file";
      uploadInput.className = "hidden";
      uploadInput.addEventListener("change", () => {
        const file = uploadInput.files[0];
        if (!file) return;
        draft.files.push({
          id: `file-${crypto.randomUUID()}`,
          name: file.name,
          size: formatFileSize(file.size),
          type: file.name.split(".").pop()?.toUpperCase() || "FILE"
        });
        uploadInput.value = "";
        renderFiles();
      });
      uploadButton.addEventListener("click", () => uploadInput.click());

      function renderFiles() {
        filesList.innerHTML = "";
        if (draft.files.length === 0) {
          const empty = document.createElement("div");
          empty.className = "assistant-meta";
          empty.textContent = "Файлы не загружены.";
          filesList.appendChild(empty);
          return;
        }
        draft.files.forEach((file) => {
          const chip = document.createElement("div");
          chip.className = "file-chip";
          const info = document.createElement("div");
          info.className = "file-info";
          const name = document.createElement("strong");
          name.textContent = file.name;
          const meta = document.createElement("div");
          meta.className = "file-meta";
          meta.textContent = `${file.type} · ${file.size}`;
          info.appendChild(name);
          info.appendChild(meta);

          const actions = document.createElement("div");
          actions.className = "file-actions";
          const download = document.createElement("button");
          download.className = "ghost";
          download.textContent = "Скачать";
          download.addEventListener("click", () => {
            downloadPlaceholderFile(file);
          });
          const remove = document.createElement("button");
          remove.className = "ghost";
          remove.textContent = "Удалить";
          remove.addEventListener("click", () => {
            draft.files = draft.files.filter((item) => item.id !== file.id);
            renderFiles();
          });
          actions.appendChild(download);
          actions.appendChild(remove);

          chip.appendChild(info);
          chip.appendChild(actions);
          filesList.appendChild(chip);
        });
      }

      renderFiles();
      filesSection.appendChild(filesTitle);
      filesSection.appendChild(filesList);
      filesSection.appendChild(uploadButton);
      filesSection.appendChild(uploadInput);

      const avatarSection = document.createElement("div");
      avatarSection.className = "modal-section";
      const avatarTitle = document.createElement("strong");
      avatarTitle.textContent = "Аватар";
      const avatarPanel = document.createElement("div");
      avatarPanel.className = "avatar-panel";
      const avatarPreview = document.createElement("div");
      avatarPreview.className = "avatar-preview";

      function renderAvatarPreview() {
        avatarPreview.innerHTML = "";
        if (draft.avatar?.kind === "image") {
          const img = document.createElement("img");
          img.src = draft.avatar.value;
          avatarPreview.appendChild(img);
          avatarPreview.style.background = "transparent";
        } else {
          avatarPreview.style.background = draft.avatar?.value || "#e59aa5";
          avatarPreview.textContent =
            draft.avatar?.initials || getInitials(draft.name || "AI");
        }
      }

      const avatarPicker = document.createElement("div");
      avatarPicker.className = "avatar-picker";
      function renderAvatarPicker() {
        avatarPicker.innerHTML = "";
        avatarPresets.forEach((preset) => {
          const swatch = document.createElement("div");
          swatch.className = "avatar-swatch";
          if (draft.avatar?.kind === "color" && draft.avatar.value === preset.color) {
            swatch.classList.add("selected");
          }
          swatch.style.background = preset.color;
          swatch.textContent = preset.initials;
          swatch.addEventListener("click", () => {
            draft.avatar = { kind: "color", value: preset.color, initials: preset.initials };
            renderAvatarPreview();
            renderAvatarPicker();
          });
          avatarPicker.appendChild(swatch);
        });
      }

      const avatarUploadButton = document.createElement("button");
      avatarUploadButton.className = "ghost";
      avatarUploadButton.textContent = "Загрузить картинку";
      const avatarInput = document.createElement("input");
      avatarInput.type = "file";
      avatarInput.accept = "image/*";
      avatarInput.className = "hidden";
      avatarInput.addEventListener("change", () => {
        const file = avatarInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          draft.avatar = { kind: "image", value: reader.result, initials: "" };
          renderAvatarPreview();
        };
        reader.readAsDataURL(file);
      });
      avatarUploadButton.addEventListener("click", () => avatarInput.click());

      if (draft.authorType === "ADMIN") {
        avatarPreview.addEventListener("click", () => avatarInput.click());
      }

      renderAvatarPreview();
      renderAvatarPicker();

      avatarPanel.appendChild(avatarPreview);
      avatarPanel.appendChild(avatarPicker);
      if (draft.authorType === "ADMIN") {
        avatarPanel.appendChild(avatarUploadButton);
        avatarPanel.appendChild(avatarInput);
      }

      avatarSection.appendChild(avatarTitle);
      avatarSection.appendChild(avatarPanel);

      const publicSection = document.createElement("div");
      publicSection.className = "modal-section";
      const switchWrapper = document.createElement("div");
      switchWrapper.className = "switch";
      const switchLabel = document.createElement("strong");
      switchLabel.textContent = "Публичное";
      const switchRow = document.createElement("div");
      switchRow.className = "switch-row";
      const switchTrack = document.createElement("div");
      switchTrack.className = `switch-track${draft.isPublic ? " on" : ""}`;
      const switchText = document.createElement("span");
      switchText.textContent = draft.isPublic ? "Опубликовано" : "Скрыто";
      const switchHint = document.createElement("div");
      switchHint.className = "hint";
      switchHint.textContent = "Определяет, будет ли приложение видно другим пользователям.";
      switchTrack.addEventListener("click", () => {
        draft.isPublic = !draft.isPublic;
        switchTrack.classList.toggle("on", draft.isPublic);
        switchText.textContent = draft.isPublic ? "Опубликовано" : "Скрыто";
      });
      switchRow.appendChild(switchTrack);
      switchRow.appendChild(switchText);
      switchWrapper.appendChild(switchLabel);
      switchWrapper.appendChild(switchRow);
      switchWrapper.appendChild(switchHint);
      publicSection.appendChild(switchWrapper);

      const error = document.createElement("div");
      error.className = "alert hidden";
      errorNode = error;

      wrapper.appendChild(competenceField);
      wrapper.appendChild(modelField);
      wrapper.appendChild(nameField);
      wrapper.appendChild(descField);
      wrapper.appendChild(promptField);
      wrapper.appendChild(authorField);
      wrapper.appendChild(authorHint);
      wrapper.appendChild(authorTypeField);
      wrapper.appendChild(authorTypeHint);
      if (draft.usesFlow) {
        wrapper.appendChild(flowField);
      }
      wrapper.appendChild(filesSection);
      wrapper.appendChild(avatarSection);
      wrapper.appendChild(publicSection);
      wrapper.appendChild(error);

      return wrapper;
    },
    footer: (close) => {
      const cancel = document.createElement("button");
      cancel.className = "ghost";
      cancel.textContent = "Отменить";
      cancel.addEventListener("click", close);

      const apply = document.createElement("button");
      apply.className = "primary";
      apply.textContent = isCreate ? "Создать" : "Применить";
      apply.addEventListener("click", () => {
        if (!errorNode) return;
        errorNode.classList.add("hidden");
        if (!draft.name.trim()) {
          errorNode.textContent = "Укажите название ассистента.";
          errorNode.classList.remove("hidden");
          return;
        }
        if (!draft.description.trim()) {
          errorNode.textContent = "Укажите краткое описание.";
          errorNode.classList.remove("hidden");
          return;
        }
        if (!draft.isSystem && !draft.prompt.trim()) {
          errorNode.textContent = "Для пользовательского ассистента нужен промпт.";
          errorNode.classList.remove("hidden");
          return;
        }

        if (isCreate) {
          state.assistants.unshift(draft);
          setAssistantListMode("system");
        } else {
          const index = state.assistants.findIndex((item) => item.id === draft.id);
          if (index !== -1) state.assistants[index] = draft;
        }
        saveState();
        renderAdminAssistants();
        refreshUserView();
        showToast(isCreate ? "Ассистент создан" : "Ассистент отредактирован", "success");
        close();
      });

      return [cancel, apply];
    }
  });

  modalRoot.appendChild(modal);
}

function openStatsModal(assistant) {
  openStatsDashboard(assistant);
}

const STATS_METRICS = [
  {
    key: "requests",
    label: "Количество запросов в AI-ассистента",
    description: "Все сообщения пользователей во всех чатах ассистента.",
    format: (value) => Math.round(value).toString()
  },
  {
    key: "uniqueUsers",
    label: "Количество уникальных пользователей",
    description: "Уникальные пользователи, воспользовавшиеся ассистентом.",
    format: (value) => Math.round(value).toString()
  },
  {
    key: "chatsCreated",
    label: "Количество созданных чатов",
    description: "Новые чаты, созданные с ассистентом.",
    format: (value) => Math.round(value).toString()
  },
  {
    key: "avgRequestsPerChat",
    label: "Среднее количество запросов в 1 чате",
    description: "Среднее число сообщений в одном чате (дробные значения).",
    format: (value) => Number(value).toFixed(2)
  },
  {
    key: "favorites",
    label: "Добавлено в «Избранное»",
    description: "Добавления ассистента в избранное от уникальных пользователей.",
    format: (value) => Math.round(value).toString()
  }
];

const statsState = {
  assistant: null,
  metricKey: "requests",
  periodType: "30",
  customStart: null,
  customEnd: null,
  lastDownloadName: null,
  chartType: "line",
  currentDate: new Date().toISOString().slice(0, 10)
};

let statsPoints = [];
const statsCache = new Map();

function openStatsDashboard(assistant) {
  statsState.assistant = getStatsAssistant(assistant);
  statsState.metricKey = "requests";
  statsState.periodType = "30";
  statsState.customStart = null;
  statsState.customEnd = null;
  statsState.lastDownloadName = null;

  statsTitle.textContent = statsState.assistant.name;
  setStatsPills("30");
  statsCustomRange.classList.remove("active");
  statsBackdrop.classList.add("active");
  statsBackdrop.setAttribute("aria-hidden", "false");

  const rows = statsState.assistant.rows;
  const maxInputDate = statsState.currentDate < rows[rows.length - 1].date
    ? statsState.currentDate
    : rows[rows.length - 1].date;
  statsCustomStart.min = rows[0].date;
  statsCustomStart.max = maxInputDate;
  statsCustomEnd.min = rows[0].date;
  statsCustomEnd.max = maxInputDate;
  statsCustomStart.value = "";
  statsCustomEnd.value = "";

  renderStatsMetricList();
  updateStatsAvailability();
  if (isStatsAvailable()) {
    updateStatsChart();
  }
}

function closeStatsModal() {
  if (!statsBackdrop) return;
  statsBackdrop.classList.remove("active");
  statsBackdrop.setAttribute("aria-hidden", "true");
}

function getStatsAssistant(assistant) {
  if (statsCache.has(assistant.id)) return statsCache.get(assistant.id);
  const rows = buildStatsRows(assistant);
  const creationDate = assistant.createdAt
    ? assistant.createdAt.slice(0, 10)
    : rows[0].date;
  const data = {
    id: assistant.id,
    name: assistant.name,
    description: assistant.description,
    creationDate,
    rows
  };
  statsCache.set(assistant.id, data);
  return data;
}

function buildStatsRows(assistant, days = 90) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  const seed = hashCode(assistant.id);
  const profile = seed % 4;
  const rows = [];
  for (let i = 0; i < days; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const ymd = toYMD(current);
    const noise = seededRand(seed, i);
    let base = 35 + (seed % 18);
    let trend = i * 0.25;
    let wave = Math.sin(i / 5) * 10;
    let spike = 0;

    if (profile === 0) {
      trend = i * 0.35;
      wave = Math.sin(i / 6) * 14;
      if (i % 17 === 0) spike = 18 + noise * 12;
    } else if (profile === 1) {
      trend = i * 0.12;
      wave = Math.cos(i / 4) * 9;
      if (i % 9 === 0) spike = 10 + noise * 8;
    } else if (profile === 2) {
      base = 28 + (seed % 10);
      trend = i * 0.2;
      wave = Math.sin(i / 3) * 6;
      if (i > 55 && i < 68) spike = 22 + noise * 15;
    } else {
      base = 50 + (seed % 14);
      trend = i * 0.05;
      wave = Math.sin(i / 8) * 16;
      if (i % 23 === 0) spike = 25 + noise * 10;
    }

    const requests = Math.max(6, base + trend + wave + spike + noise * 6);
    const uniqueUsers = Math.max(3, requests * (0.22 + noise * 0.12));
    const chatsCreated = Math.max(2, requests * (0.18 + noise * 0.08));
    const avgRequestsPerChat = Math.max(1.1, requests / Math.max(1, chatsCreated));
    const favorites = Math.max(1, uniqueUsers * (0.08 + noise * 0.06));

    rows.push({
      date: ymd,
      dateLabel: formatDM(current),
      dateLabelFull: formatDMY(current),
      requests,
      uniqueUsers,
      chatsCreated,
      avgRequestsPerChat,
      favorites
    });
  }
  return rows;
}

function hashCode(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRand(seed, i) {
  const x = Math.sin(seed * 0.001 + i * 0.17) * 43758.5453;
  return x - Math.floor(x);
}

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(value) {
  return new Date(`${value}T00:00:00Z`);
}

function formatDM(date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

function formatDMY(date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

function formatYMD(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function diffDays(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86400000) + 1;
}

function clampRange(start, end, minDate, maxDate) {
  const clampedStart = start < minDate ? minDate : start;
  const clampedEnd = end > maxDate ? maxDate : end;
  return { start: clampedStart, end: clampedEnd };
}

function getStatsRowsForPeriod() {
  const rows = statsState.assistant.rows;
  const dataMin = parseDate(rows[0].date);
  const dataMax = parseDate(rows[rows.length - 1].date);
  const creationDate = parseDate(statsState.assistant.creationDate);
  const currentDate = parseDate(statsState.currentDate);
  const minDate = creationDate > dataMin ? creationDate : dataMin;
  const maxDate = currentDate < dataMax ? currentDate : dataMax;
  const availableRows = rows.filter((row) => {
    const date = parseDate(row.date);
    return date >= minDate && date <= maxDate;
  });

  if (statsState.periodType === "30" || statsState.periodType === "7") {
    const days = Number(statsState.periodType);
    if (!availableRows.length) {
      return { rows: [], start: minDate, end: maxDate, stepX: 1 };
    }
    const slice = availableRows.slice(Math.max(availableRows.length - days, 0));
    const start = parseDate(slice[0].date);
    const end = parseDate(slice[slice.length - 1].date);
    return {
      rows: slice,
      start,
      end,
      clamped: false,
      stepX: slice.length >= 26 ? 5 : slice.length >= 12 ? 2 : 1
    };
  }

  if (statsState.customStart && statsState.customEnd) {
    let start = parseDate(statsState.customStart);
    let end = parseDate(statsState.customEnd);

    if (start > end) {
      [start, end] = [end, start];
    }

    const length = diffDays(start, end);
    if (length > 30) {
      return { invalid: true, rows: [], start, end, stepX: 1 };
    }

    const clamped = clampRange(start, end, minDate, maxDate);
    const filtered = availableRows.filter((row) => {
      const date = parseDate(row.date);
      return date >= clamped.start && date <= clamped.end;
    });

    return {
      rows: filtered,
      start: clamped.start,
      end: clamped.end,
      clamped: clamped.start.getTime() !== start.getTime() || clamped.end.getTime() !== end.getTime(),
      requestedLength: length,
      stepX: filtered.length >= 26 ? 5 : filtered.length >= 12 ? 2 : 1
    };
  }

  return { rows: [], start: minDate, end: maxDate, stepX: 1 };
}

function niceStep(maxValue, targetTicks = 5) {
  if (maxValue <= 0) return 1;
  const rough = maxValue / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const candidates = [1, 2, 5, 10].map((n) => n * magnitude);
  return candidates.find((c) => c >= rough) || candidates[candidates.length - 1] * 10;
}

function updateStatsChart() {
  if (!isStatsAvailable()) return;

  const { rows, start, end, stepX, invalid, clamped, requestedLength } = getStatsRowsForPeriod();
  const metric = STATS_METRICS.find((item) => item.key === statsState.metricKey);

  statsMetricTitle.textContent = metric.label;
  statsMetricDescription.textContent = metric.description;

  const subtitle = `Период: с ${formatDMY(start)} по ${formatDMY(end)}`;
  statsSubtitle.textContent = clamped ? `${subtitle} (обрезано по доступным данным)` : subtitle;

  if (invalid) {
    statsCustomHint.textContent = "Выбрать период более 30 дней нельзя.";
    statsCustomHint.style.color = "var(--accent)";
    return;
  }

  if (statsState.periodType === "custom" && requestedLength) {
    if (clamped) {
      statsCustomHint.textContent =
        "Ассистент существует меньше выбранного периода — показываем доступные дни.";
      statsCustomHint.style.color = "var(--accent)";
    } else {
      statsCustomHint.textContent = "Период выбран корректно (до 30 дней).";
      statsCustomHint.style.color = "var(--accent)";
    }
  } else {
    statsCustomHint.textContent = "Максимальная длина периода — 30 дней.";
    statsCustomHint.style.color = "var(--accent)";
  }

  if (!rows.length) {
    const ctx = statsChart.getContext("2d");
    resizeStatsCanvas(statsChart);
    ctx.clearRect(0, 0, statsChart.width, statsChart.height);
    statsAxisNote.textContent = "Выберите период, чтобы отрисовать график.";
    return;
  }

  drawStatsChart(rows, metric, stepX);
}

function resizeStatsCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  return dpr;
}

function drawStatsChart(rows, metric, stepX) {
  const ctx = statsChart.getContext("2d");
  const dpr = resizeStatsCanvas(statsChart);
  const width = statsChart.width;
  const height = statsChart.height;

  ctx.clearRect(0, 0, width, height);

  const padding = { top: 24, right: 24, bottom: 42, left: 54 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const values = rows.map((row) => row[metric.key]);
  const maxValue = Math.max(...values, 0);
  const stepY = niceStep(maxValue);
  const yMax = stepY * 5;

  ctx.strokeStyle = "rgba(199, 93, 107, 0.15)";
  ctx.lineWidth = 1 * dpr;
  ctx.font = `${12 * dpr}px Segoe UI`;
  ctx.fillStyle = "rgba(132, 102, 102, 0.8)";

  for (let i = 0; i <= 5; i += 1) {
    const y = padding.top + (plotHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    const value = Math.round(yMax - (yMax / 5) * i);
    ctx.fillText(value.toString(), 6 * dpr, y + 4 * dpr);
  }

  const denom = Math.max(rows.length - 1, 1);
  if (statsState.chartType === "bar") {
    const slot = plotWidth / rows.length;
    const barWidth = Math.max(slot * 0.6, 6 * dpr);
    ctx.fillStyle = "rgba(199, 93, 107, 0.65)";
    statsPoints = rows.map((row, index) => {
      const value = row[metric.key];
      const x = padding.left + slot * index + (slot - barWidth) / 2;
      const y = padding.top + plotHeight - (value / yMax) * plotHeight;
      const barHeight = padding.top + plotHeight - y;
      ctx.fillRect(x, y, barWidth, barHeight);
      return { x: x + barWidth / 2, y, row };
    });
  } else {
    ctx.strokeStyle = "rgba(199, 93, 107, 0.35)";
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    statsPoints = rows.map((row, index) => {
      const value = row[metric.key];
      const x = padding.left + (plotWidth / denom) * index;
      const y = padding.top + plotHeight - (value / yMax) * plotHeight;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      return { x, y, row };
    });

    ctx.stroke();

    ctx.fillStyle = "rgba(199, 93, 107, 0.8)";
    statsPoints.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3.5 * dpr, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.fillStyle = "rgba(132, 102, 102, 0.8)";
  ctx.font = `${11 * dpr}px Segoe UI`;

  rows.forEach((row, index) => {
    if (index % stepX !== 0 && index !== rows.length - 1) {
      return;
    }
    const x = padding.left + (plotWidth / denom) * index;
    const label = row.dateLabel;
    ctx.fillText(label, x - 10 * dpr, height - 14 * dpr);
  });

  statsAxisNote.textContent = `Адаптивные подписи: шаг X — каждые ${stepX} дн., шаг Y — ${stepY}`;
}

function handleStatsTooltip(event) {
  if (!statsPoints.length) return;
  const rect = statsChart.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const x = (event.clientX - rect.left) * dpr;
  const closest = statsPoints.reduce((prev, current) => {
    return Math.abs(current.x - x) < Math.abs(prev.x - x) ? current : prev;
  });
  const metric = STATS_METRICS.find((item) => item.key === statsState.metricKey);
  const value = metric.format(closest.row[metric.key]);
  statsTooltip.textContent = `${closest.row.dateLabelFull} · ${value}`;
  statsTooltip.style.display = "block";
  statsTooltip.style.left = `${closest.x / dpr + 12}px`;
  statsTooltip.style.top = `${closest.y / dpr - 12}px`;
}

function hideStatsTooltip() {
  if (!statsTooltip) return;
  statsTooltip.style.display = "none";
}

function renderStatsMetricList() {
  statsMetricList.innerHTML = "";
  STATS_METRICS.forEach((metric) => {
    const button = document.createElement("button");
    button.className = "stats-metric";
    button.dataset.metric = metric.key;
    button.textContent = metric.label;
    if (metric.key === statsState.metricKey) {
      button.classList.add("active");
    }
    statsMetricList.appendChild(button);
  });
}

function handleStatsMetricClick(event) {
  const button = event.target.closest(".stats-metric");
  if (!button) return;
  statsState.metricKey = button.dataset.metric;
  renderStatsMetricList();
  updateStatsChart();
}

function setStatsPills(type) {
  document.querySelectorAll(".stats-pill").forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.period === type);
  });
}

function setStatsPeriod(type) {
  statsState.periodType = type;
  setStatsPills(type);
  if (type === "custom") {
    statsCustomRange.classList.add("active");
  } else {
    statsCustomRange.classList.remove("active");
  }
  updateStatsAvailability();
  updateStatsChart();
}

function handleStatsCustomRange() {
  if (!statsCustomStart.value || !statsCustomEnd.value) return;
  statsState.customStart = statsCustomStart.value;
  statsState.customEnd = statsCustomEnd.value;
  updateStatsChart();
}

function handleStatsChartToggle(event) {
  const button = event.target.closest(".stats-toggle-btn");
  if (!button) return;
  statsState.chartType = button.dataset.chart;
  statsChartToggle.querySelectorAll(".stats-toggle-btn").forEach((item) => {
    item.classList.toggle("active", item.dataset.chart === statsState.chartType);
  });
  updateStatsChart();
}

function isStatsAvailable() {
  const creationDate = parseDate(statsState.assistant.creationDate);
  const availableAt = new Date(creationDate);
  availableAt.setUTCDate(availableAt.getUTCDate() + 7);
  const now = parseDate(statsState.currentDate);
  return now >= availableAt;
}

function updateStatsAvailability() {
  const available = isStatsAvailable();
  const creationDate = parseDate(statsState.assistant.creationDate);
  const availableAt = new Date(creationDate);
  availableAt.setUTCDate(availableAt.getUTCDate() + 7);

  statsAvailability.classList.toggle("active", !available);
  statsMetricList.style.display = available ? "block" : "none";
  document.querySelector(".stats-chart-area").style.display = available ? "block" : "none";
  document.querySelector(".stats-periods").style.display = available ? "flex" : "none";
  if (!available) {
    statsCustomRange.classList.remove("active");
  }
  statsAvailabilityDate.textContent = `Доступно с ${formatDMY(availableAt)} (00:00 МСК)`;
}

function downloadStatsCsv() {
  if (!isStatsAvailable()) return;
  const { rows, start, end, invalid } = getStatsRowsForPeriod();
  if (invalid || !rows.length) return;

  const startLabel = formatYMD(start).replace(/-/g, "");
  const endLabel = formatYMD(end).replace(/-/g, "");
  const filename = `${statsState.assistant.name}_${startLabel}-${endLabel}.csv`;

  if (statsState.lastDownloadName === filename) {
    statsAxisNote.textContent = "Отчёт уже скачан для этого периода (идемпотентная выдача).";
    return;
  }

  const headers = ["Дата", ...STATS_METRICS.map((metric) => metric.label)];
  const lines = [headers.join(";")];

  rows.forEach((row) => {
    const values = STATS_METRICS.map((metric) => metric.format(row[metric.key]));
    lines.push([row.dateLabel, ...values].join(";"));
  });

  const csvContent = "\ufeff" + lines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  statsState.lastDownloadName = filename;
  statsAxisNote.textContent = `Отчёт «${filename}» сформирован.`;
}

window.addEventListener("resize", () => {
  if (statsBackdrop && statsBackdrop.classList.contains("active")) {
    updateStatsChart();
  }
});

function openDeleteModal(assistant) {
  const modal = buildModal({
    title: "Удалить AI-ассистента",
    body: () => {
      const wrapper = document.createElement("div");
      wrapper.className = "modal-body";
      const text = document.createElement("p");
      text.textContent = "Вы точно хотите безвозвратно удалить AI-ассистента?";
      wrapper.appendChild(text);
      return wrapper;
    },
    footer: (close) => {
      const cancel = document.createElement("button");
      cancel.className = "ghost";
      cancel.textContent = "Отмена";
      cancel.addEventListener("click", close);
      const remove = document.createElement("button");
      remove.className = "danger-button";
      remove.textContent = "Удалить";
      remove.addEventListener("click", () => {
        state.assistants = state.assistants.filter((item) => item.id !== assistant.id);
        saveState();
        renderAdminAssistants();
        refreshUserView();
        showToast("Ассистент удален", "danger");
        close();
      });
      return [cancel, remove];
    }
  });
  modalRoot.appendChild(modal);
}

function generateAssistantLink(assistant) {
  const link = `https://alfa-people.example.com/ai-chat/${assistant.id}`;
  copyToClipboard(link)
    .then(() => {
      showToast("Ссылка скопирована", "success");
    })
    .catch(() => {
      showToast("Не удалось скопировать ссылку", "danger");
    });
}

function showToast(message, tone = "success") {
  const toast = document.createElement("div");
  toast.className = "toast";
  const icon = document.createElement("span");
  icon.className = tone;
  icon.textContent = tone === "danger" ? "!" : "?";
  const text = document.createElement("span");
  text.textContent = message;
  toast.appendChild(icon);
  toast.appendChild(text);
  toastRoot.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2400);
}

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (success) resolve();
    else reject();
  });
}

function downloadPlaceholderFile(file) {
  const blob = new Blob([`Файл: ${file.name}`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function getInitials(value) {
  const parts = value.split(" ").filter(Boolean);
  if (parts.length === 0) return "AI";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}


function openNotificationModal() {
  const modal = buildModal({
    title: "Создать уведомление",
    body: () => {
      const wrapper = document.createElement("div");
      wrapper.className = "modal-body";
      wrapper.innerHTML = `
        <label class="field">
          <span>Заголовок</span>
          <input id="n-title" type="text" />
        </label>
        <label class="field">
          <span>Текст</span>
          <textarea id="n-text"></textarea>
        </label>
        <label class="field">
          <span>Ссылка (необязательно)</span>
          <input id="n-link" type="text" />
        </label>
        <label class="field inline">
          <input id="n-important" type="checkbox" />
          <span>Важное уведомление</span>
        </label>
        <label class="field" id="cta-field" style="display:none">
          <span>Текст кнопки</span>
          <input id="n-cta" type="text" placeholder="Ознакомился" />
        </label>
        <label class="field">
          <span>Период отображения: начало</span>
          <input id="n-start" type="datetime-local" />
        </label>
        <label class="field">
          <span>Период отображения: конец</span>
          <input id="n-end" type="datetime-local" />
        </label>
        <label class="field">
          <span>Аудитория</span>
          <select id="n-audience">
            <option value="all">Всем пользователям</option>
            <option value="selected">Выбрать пользователей</option>
          </select>
        </label>
        <label class="field" id="user-ids-field" style="display:none">
          <span>User IDs (через запятую)</span>
          <input id="n-user-ids" type="text" />
        </label>
        <div class="field">
          <span>Контуры</span>
          <label class="field inline"><input id="n-contour-in" type="checkbox" checked />В контуре банка</label>
          <label class="field inline"><input id="n-contour-out" type="checkbox" />Вне контура банка</label>
        </div>
        <div id="n-error" class="alert hidden"></div>
      `;

      const importantCheckbox = wrapper.querySelector("#n-important");
      const ctaField = wrapper.querySelector("#cta-field");
      importantCheckbox.addEventListener("change", () => {
        ctaField.style.display = importantCheckbox.checked ? "flex" : "none";
      });

      const audienceSelect = wrapper.querySelector("#n-audience");
      const userIdsField = wrapper.querySelector("#user-ids-field");
      audienceSelect.addEventListener("change", () => {
        userIdsField.style.display = audienceSelect.value === "selected" ? "flex" : "none";
      });
      return wrapper;
    },
    footer: (close) => {
      const save = document.createElement("button");
      save.className = "primary";
      save.textContent = "Опубликовать";
      save.addEventListener("click", () => {
        const title = document.getElementById("n-title").value.trim();
        const text = document.getElementById("n-text").value.trim();
        const link = document.getElementById("n-link").value.trim();
        const important = document.getElementById("n-important").checked;
        const ctaText = document.getElementById("n-cta").value.trim();
        const startAt = document.getElementById("n-start").value || null;
        const endAt = document.getElementById("n-end").value || null;
        const audience = document.getElementById("n-audience").value;
        const userIdsRaw = document.getElementById("n-user-ids").value.trim();
        const contourIn = document.getElementById("n-contour-in").checked;
        const contourOut = document.getElementById("n-contour-out").checked;
        const error = document.getElementById("n-error");
        error.classList.add("hidden");

        if (!title || !text) {
          error.textContent = "Нужно заполнить заголовок и текст.";
          error.classList.remove("hidden");
          return;
        }

        if (!contourIn && !contourOut) {
          error.textContent = "Нужно выбрать хотя бы один контур.";
          error.classList.remove("hidden");
          return;
        }

        let userIds = [];
        if (audience === "selected") {
          userIds = userIdsRaw
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
          const missing = userIds.filter((id) => !state.users.includes(id));
          if (userIds.length === 0 || missing.length > 0) {
            error.textContent = "Укажите существующие user_id (из списка пользователей).";
            error.classList.remove("hidden");
            return;
          }
        }

        if (important && !ctaText) {
          error.textContent = "Для важного уведомления нужен текст кнопки.";
          error.classList.remove("hidden");
          return;
        }

        if (important) {
          const conflict = state.notifications.some((item) => {
            if (!item.important) return false;
            if (!item.startAt || !item.endAt || !startAt || !endAt) return false;
            const start = new Date(startAt);
            const end = new Date(endAt);
            const otherStart = new Date(item.startAt);
            const otherEnd = new Date(item.endAt);
            return start <= otherEnd && end >= otherStart;
          });
          if (conflict) {
            error.textContent = "Период важного уведомления пересекается с существующим.";
            error.classList.remove("hidden");
            return;
          }
        }

        const notification = {
          id: `n-${crypto.randomUUID()}`,
          title,
          text,
          link: link || "",
          important,
          ctaText: important ? ctaText : "",
          startAt,
          endAt,
          audience,
          userIds,
          contours: {
            in: contourIn,
            out: contourOut
          },
          createdAt: new Date().toISOString()
        };

        state.notifications.push(notification);
        saveState();
        renderAdminNotifications();
        refreshUserView();
        maybeShowImportantModal();
        close();
      });
      return [save];
    }
  });
  modalRoot.appendChild(modal);
}

function openBannerModal() {
  const modal = buildModal({
    title: "Создать баннер",
    body: () => {
      const wrapper = document.createElement("div");
      wrapper.className = "modal-body";
      wrapper.innerHTML = `
        <label class="field">
          <span>Заголовок</span>
          <input id="b-title" type="text" />
        </label>
        <label class="field">
          <span>Текст</span>
          <textarea id="b-text"></textarea>
        </label>
        <label class="field">
          <span>Ссылка</span>
          <input id="b-link" type="text" />
        </label>
        <label class="field">
          <span>Текст кнопки</span>
          <input id="b-cta" type="text" />
        </label>
        <label class="field">
          <span>Изображение (URL)</span>
          <input id="b-image" type="text" />
        </label>
        <label class="field">
          <span>Период отображения: начало</span>
          <input id="b-start" type="datetime-local" />
        </label>
        <label class="field">
          <span>Период отображения: конец</span>
          <input id="b-end" type="datetime-local" />
        </label>
        <label class="field inline">
          <input id="b-default" type="checkbox" />
          <span>По умолчанию</span>
        </label>
        <div id="b-error" class="alert hidden"></div>
      `;
      return wrapper;
    },
    footer: (close) => {
      const save = document.createElement("button");
      save.className = "primary";
      save.textContent = "Сохранить";
      save.addEventListener("click", () => {
        const title = document.getElementById("b-title").value.trim();
        const text = document.getElementById("b-text").value.trim();
        const link = document.getElementById("b-link").value.trim();
        const ctaText = document.getElementById("b-cta").value.trim();
        const image = document.getElementById("b-image").value.trim();
        const startAt = document.getElementById("b-start").value || null;
        const endAt = document.getElementById("b-end").value || null;
        const isDefault = document.getElementById("b-default").checked;
        const error = document.getElementById("b-error");
        error.classList.add("hidden");

        if (!title || !text) {
          error.textContent = "Заполните заголовок и текст.";
          error.classList.remove("hidden");
          return;
        }

        if (!state.banners.some((banner) => banner.isDefault) && !isDefault) {
          error.textContent = "Сначала выберите баннер по умолчанию.";
          error.classList.remove("hidden");
          return;
        }

        const banner = {
          id: `b-${crypto.randomUUID()}`,
          title,
          text,
          link: link || "",
          ctaText: ctaText || "Подробнее",
          image: image || "",
          startAt,
          endAt,
          enabled: true,
          isDefault,
          createdAt: new Date().toISOString()
        };

        if (isDefault) {
          state.banners.forEach((b) => {
            b.isDefault = false;
          });
        }

        state.banners.push(banner);
        saveState();
        renderAdminBanners();
        refreshUserView();
        close();
      });
      return [save];
    }
  });
  modalRoot.appendChild(modal);
}

function buildModal({ title, body, footer, onClose, className, footerOutside }) {
  const backdrop = document.createElement("div");
  backdrop.className = `modal-backdrop${footerOutside ? " modal-stack" : ""}`;

  const container = document.createElement("div");
  container.className = `modal${className ? ` ${className}` : ""}`;

  const header = document.createElement("div");
  header.className = "modal-header";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const closeButton = document.createElement("button");
  closeButton.className = "icon";
  closeButton.textContent = "?";
  header.appendChild(heading);
  header.appendChild(closeButton);

  const bodyNode = body();

  const footerNode = document.createElement("div");
  footerNode.className = "modal-footer";
  const close = () => {
    backdrop.remove();
    if (onClose) onClose();
  };

  if (footer) {
    footer(close).forEach((node) => footerNode.appendChild(node));
  }

  closeButton.addEventListener("click", close);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });

  container.appendChild(header);
  container.appendChild(bodyNode);
  if (!footerOutside) {
    container.appendChild(footerNode);
  } else {
    footerNode.classList.add("outside");
  }
  backdrop.appendChild(container);
  if (footerOutside) {
    backdrop.appendChild(footerNode);
  }

  return backdrop;
}
