/**
 * Service worker — handles extension lifecycle, context menu, and scheduled tasks.
 */

import { getScheduledTasks, updateScheduledTask, deleteScheduledTask } from "../storage/templates";
import { ScheduledTask, PLATFORM_URLS, ScheduleType } from "../models/template";

// ── 計算下次執行時間 ──────────────────────────────

function calcNextRunAt(task: ScheduledTask): number | null {
  const now = Date.now();

  if (task.scheduleType === "once") {
    // Parse ISO datetime
    const t = new Date(task.scheduleTime).getTime();
    return t > now ? t : null; // null means expired
  }

  // Parse HH:mm
  const [hh, mm] = task.scheduleTime.split(":").map(Number);
  const base = new Date();
  base.setHours(hh, mm, 0, 0);

  if (task.scheduleType === "daily") {
    if (base.getTime() <= now) base.setDate(base.getDate() + 1);
    return base.getTime();
  }

  if (task.scheduleType === "weekly") {
    const days = task.weekdays.length > 0 ? task.weekdays : [1]; // default Mon
    // Find next matching weekday
    for (let offset = 0; offset <= 7; offset++) {
      const candidate = new Date(base.getTime() + offset * 86400000);
      if (
        days.includes(candidate.getDay()) &&
        candidate.getTime() > now
      ) {
        return candidate.getTime();
      }
    }
    return null;
  }

  return null;
}

// ── 排程鬧鐘設定 ──────────────────────────────

async function scheduleAlarm(task: ScheduledTask): Promise<void> {
  if (!task.enabled) return;

  const nextRunAt = calcNextRunAt(task);
  if (nextRunAt === null) {
    // Expired once-task: disable
    if (task.scheduleType === "once") {
      await updateScheduledTask(task.id, { enabled: false });
    }
    return;
  }

  const alarmName = `scheduled-task:${task.id}`;
  await chrome.alarms.create(alarmName, { when: nextRunAt });
  await updateScheduledTask(task.id, { nextRunAt });
}

async function scheduleAllEnabledTasks(): Promise<void> {
  try {
    const tasks = await getScheduledTasks();
    for (const task of tasks) {
      if (task.enabled) {
        await scheduleAlarm(task);
      }
    }
  } catch (err) {
    console.error("[ServiceWorker] Failed to schedule tasks:", err);
  }
}

// ── 發送提示詞 ──────────────────────────────

async function sendScheduledPrompt(task: ScheduledTask): Promise<void> {
  const template = (await (
    await import("../storage/templates")
  ).getTemplates()).find((t) => t.id === task.templateId);

  if (!template) {
    console.warn("[ServiceWorker] Template not found for task:", task.id);
    return;
  }

  // Fill variables into template content
  let content = template.content;
  for (const [name, value] of Object.entries(task.variables)) {
    content = content.replaceAll(`{{${name}}}`, value);
  }

  const platformUrl = PLATFORM_URLS[task.platform];

  // Find existing tab or create new one
  const tabs = await chrome.tabs.query({ url: platformUrl + "*" });
  let targetTab = tabs[0];

  if (!targetTab) {
    targetTab = await chrome.tabs.create({ url: platformUrl, active: false });
  }

  if (!targetTab.id) return;

  // Wait for tab to be fully loaded, then inject prompt
  const tabId = targetTab.id;

  const injectPrompt = () => {
    chrome.tabs.sendMessage(tabId, {
      type: "SCHEDULED_PROMPT",
      content,
      autoSubmit: task.autoSubmit,
    }).catch(() => { /* content script not ready yet */ });
  };

  if (targetTab.status === "complete") {
    injectPrompt();
  } else {
    const onUpdated = (updatedTabId: number, info: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        // Small delay to let content script initialize
        setTimeout(injectPrompt, 1000);
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
  }

  // Show notification
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: "定時提示詞已發送",
    message: `「${task.name}」已傳送至 ${task.platform}`,
  });
}

// ── 鬧鐘處理 ──────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith("scheduled-task:")) return;

  const taskId = alarm.name.slice("scheduled-task:".length);

  try {
    const tasks = await getScheduledTasks();
    const task = tasks.find((t) => t.id === taskId);

    if (!task || !task.enabled) return;

    await sendScheduledPrompt(task);

    // Update last run and schedule next
    if (task.scheduleType === "once") {
      await updateScheduledTask(taskId, {
        lastRunAt: Date.now(),
        enabled: false,
      });
    } else {
      const updatedTask = { ...task, lastRunAt: Date.now() };
      const nextRunAt = calcNextRunAt(updatedTask);
      if (nextRunAt !== null) {
        await updateScheduledTask(taskId, {
          lastRunAt: Date.now(),
          nextRunAt,
        });
        await chrome.alarms.create(alarm.name, { when: nextRunAt });
      } else {
        await updateScheduledTask(taskId, {
          lastRunAt: Date.now(),
          enabled: false,
        });
      }
    }
  } catch (err) {
    console.error("[ServiceWorker] Alarm handler error:", err);
  }
});

// ── 初始化 ──────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Remove all existing menus to avoid duplicate ID errors on update
  chrome.contextMenus?.removeAll(() => {
    chrome.contextMenus?.create({
      id: "aps-toggle",
      title: "切換 AI Prompt Sidebar",
      contexts: ["page"],
      documentUrlPatterns: [
        "https://x.com/i/grok*",
        "https://grok.com/*",
        "https://gemini.google.com/*",
        "https://chatgpt.com/*",
        "https://claude.ai/*",
      ],
    });
  });

  // Schedule all enabled tasks on install/update
  scheduleAllEnabledTasks();
});

// Re-schedule on startup (service worker may have been killed)
chrome.runtime.onStartup.addListener(() => {
  scheduleAllEnabledTasks();
});

// Context menu click
chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "aps-toggle" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" }).catch(() => {});
  }
});

// Keyboard shortcut (if defined in manifest commands)
chrome.commands?.onCommand.addListener((command) => {
  if (command === "toggle-sidebar") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE_SIDEBAR" }).catch(() => {});
      }
    });
  }
  if (command === "open-management") {
    // Open management page in a new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL("management.html"),
    });
  }
});

// Handle messages from popup / management page
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] ?? null });
    });
    return true; // async
  }

  // Register / update alarm for a scheduled task
  if (msg.type === "SCHEDULE_TASK") {
    const task: ScheduledTask = msg.task;
    scheduleAlarm(task).then(() => sendResponse({ ok: true })).catch((err) => {
      console.error("[ServiceWorker] SCHEDULE_TASK error:", err);
      sendResponse({ ok: false });
    });
    return true;
  }

  // Cancel alarm for a deleted/disabled task
  if (msg.type === "CANCEL_TASK") {
    const alarmName = `scheduled-task:${msg.taskId}`;
    chrome.alarms.clear(alarmName, () => sendResponse({ ok: true }));
    return true;
  }

  return false;
});
