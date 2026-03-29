/**
 * Content script entry point.
 * Injects the sidebar into supported AI chat platforms.
 */

import { detectAdapter } from "../adapters/base";
import {
  initDefaults,
  getTemplates,
  getCategories,
  getSettings,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  saveTemplates,
  saveCategories,
} from "../storage/templates";
import { Template, extractVariables } from "../models/template";
import { TemplateUI, showToast } from "./template-ui";

(async function main() {
  // Prevent duplicate injection
  if (document.getElementById("aps-sidebar")) return;

  // Detect current platform
  const adapter = detectAdapter();
  if (!adapter) return; // unsupported page

  // Initialise default templates on first run
  const defaultsUrl = chrome.runtime.getURL("defaults.json");
  await initDefaults(defaultsUrl);

  // Load data
  const settings = await getSettings();
  const templates = await getTemplates();
  const categories = await getCategories();

  // Determine theme
  const theme =
    settings.theme === "auto" ? adapter.getTheme() : settings.theme;

  // ── Build sidebar skeleton ───────────────── 
  const sidebar = document.createElement("div");
  sidebar.id = "aps-sidebar";
  if (theme === "dark") sidebar.classList.add("aps-dark");
  if (!settings.autoShow) sidebar.classList.add("aps-hidden");

  // Apply dynamic sidebar width
  if (settings.sidebarWidth && settings.sidebarWidth !== 340) {
    sidebar.style.setProperty("--aps-width", `${settings.sidebarWidth}px`);
  }

  // Header
  const header = document.createElement("div");
  header.className = "aps-header";
  header.innerHTML = `
    <h2>📊 AI Prompt Sidebar</h2>
    <div class="aps-header-actions">
      <button class="aps-icon-btn" id="aps-add-btn" title="新增模板">＋</button>
      <button class="aps-icon-btn" id="aps-refresh-btn" title="重新載入">🔄</button>
      <button class="aps-icon-btn" id="aps-close-btn" title="關閉側邊欄">✕</button>
    </div>
  `;
  sidebar.appendChild(header);

  // Content area (managed by TemplateUI)
  const contentArea = document.createElement("div");
  contentArea.id = "aps-content-area";
  contentArea.style.display = "flex";
  contentArea.style.flexDirection = "column";
  contentArea.style.flex = "1";
  contentArea.style.overflow = "hidden";
  sidebar.appendChild(contentArea);

  document.body.appendChild(sidebar);

  // ── Toggle button ───────────────────────────
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "aps-toggle-btn";
  toggleBtn.textContent = "📊";
  toggleBtn.title = "AI Prompt Sidebar";
  if (!sidebar.classList.contains("aps-hidden")) {
    toggleBtn.classList.add("aps-open");
  }
  document.body.appendChild(toggleBtn);

  function toggleSidebar() {
    const hidden = sidebar.classList.toggle("aps-hidden");
    toggleBtn.classList.toggle("aps-open", !hidden);
  }

  toggleBtn.addEventListener("click", toggleSidebar);

  // ── TemplateUI instance ─────────────────────
  const ui = new TemplateUI(contentArea, adapter);
  ui.setData(templates, categories);

  // Callbacks
  /** Refresh UI with fresh data from storage */
  async function refreshUI() {
    const freshT = await getTemplates();
    const freshC = await getCategories();
    ui.setData(freshT, freshC);
  }

  ui.onAddTemplate = async (name, category, content) => {
    await addTemplate({ name, category, content });
    await refreshUI();
    ui.goToList();
    showToast("✅ 模板已儲存");
  };

  ui.onDeleteTemplate = async (id) => {
    await deleteTemplate(id);
    await refreshUI();
    ui.goToList();
    showToast("🗑️ 模板已刪除");
  };

  ui.onUpdateTemplate = async (id, name, category, content) => {
    await updateTemplate(id, { name, category, content });
    await refreshUI();
    ui.goToList();
    showToast("✅ 模板已更新");
  };

  ui.onToggleFavorite = async (id, isFavorite) => {
    await updateTemplate(id, { isFavorite });
    await refreshUI();
  };

  ui.onExportTemplates = async () => {
    const t = await getTemplates();
    const c = await getCategories();
    const blob = new Blob([JSON.stringify({ categories: c, templates: t }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-prompt-sidebar-templates.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("📤 模板已匯出");
  };

  ui.onImportTemplates = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!Array.isArray(data.templates)) {
          showToast("無效的模板檔案格式", true);
          return;
        }
        const now = Date.now();
        const imported: Template[] = data.templates.map((t: Record<string, unknown>) => ({
          id: crypto.randomUUID(),
          name: String(t.name ?? ""),
          category: String(t.category ?? "自訂"),
          content: String(t.content ?? ""),
          variables: extractVariables(String(t.content ?? "")),
          platform: t.platform ? String(t.platform) : undefined,
          tags: Array.isArray(t.tags) ? t.tags.map(String).filter((s: string) => s.length <= 50) : undefined,
          createdAt: now,
          updatedAt: now,
        }));
        const existing = await getTemplates();
        await saveTemplates([...existing, ...imported]);
        if (Array.isArray(data.categories)) {
          const existingCats = await getCategories();
          const existingNames = new Set(existingCats.map((c) => c.name));
          const newCats = data.categories
            .filter((c: unknown): boolean => {
              if (typeof c !== "object" || c === null) return false;
              const obj = c as Record<string, unknown>;
              return (
                typeof obj.id === "string" &&
                typeof obj.name === "string" &&
                typeof obj.icon === "string" &&
                typeof obj.order === "number"
              );
            })
            .filter((c: { name: string }) => !existingNames.has(c.name));
          if (newCats.length > 0) {
            await saveCategories([...existingCats, ...newCats]);
          }
        }
        const freshT = await getTemplates();
        const freshC = await getCategories();
        ui.setData(freshT, freshC);
        showToast(`📥 已匯入 ${imported.length} 個模板`);
      } catch {
        showToast("匯入失敗，請確認檔案格式", true);
      }
    });
    fileInput.click();
  };

  // Header button handlers
  document.getElementById("aps-close-btn")!.addEventListener("click", toggleSidebar);
  document.getElementById("aps-add-btn")!.addEventListener("click", () => {
    ui.renderCreateView();
  });
  document.getElementById("aps-refresh-btn")!.addEventListener("click", async () => {
    const t = await getTemplates();
    const c = await getCategories();
    ui.setData(t, c);
    showToast("✅ 已重新載入");
  });

  // ── SPA navigation detection ────────────────
  let lastUrl = location.href;
  function checkUrlChange() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      const newAdapter = detectAdapter();
      if (!newAdapter) {
        sidebar.classList.add("aps-hidden");
        toggleBtn.style.display = "none";
      } else {
        toggleBtn.style.display = "";
      }
    }
  }

  // Primary: listen for History API navigation events
  window.addEventListener("popstate", checkUrlChange);
  window.addEventListener("hashchange", checkUrlChange);

  // Fallback: debounced MutationObserver for pushState (not caught by popstate)
  let urlCheckTimer: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (urlCheckTimer) return;
    urlCheckTimer = setTimeout(() => {
      urlCheckTimer = null;
      checkUrlChange();
    }, 300);
  });
  observer.observe(document.body, { childList: true, subtree: false });

  // ── Listen for messages from popup/service-worker ──
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TOGGLE_SIDEBAR") {
      toggleSidebar();
    }
    if (msg.type === "SETTINGS_CHANGED") {
      // Reload settings and reapply theme + width
      getSettings().then((s) => {
        const newTheme = s.theme === "auto" ? adapter.getTheme() : s.theme;
        sidebar.classList.toggle("aps-dark", newTheme === "dark");
        sidebar.style.setProperty("--aps-width", `${s.sidebarWidth}px`);
      });
    }
    if (msg.type === "RESET_DEFAULTS") {
      // Clear sentinel so initDefaults can re-run after reset
      chrome.storage.local.remove("aps_initialized", () => {
        initDefaults(defaultsUrl)
          .then(async () => {
            await refreshUI();
            const s = await getSettings();
            const newTheme = s.theme === "auto" ? adapter.getTheme() : s.theme;
            sidebar.classList.toggle("aps-dark", newTheme === "dark");
            sidebar.style.setProperty("--aps-width", `${s.sidebarWidth}px`);
            showToast("✅ 已重設為預設模板");
          })
          .catch(() => showToast("重設失敗，請重試", true));
      });
    }
  });
})();
