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
  deleteTemplate,
} from "../storage/templates";
import { TemplateUI, showToast } from "./template-ui";

(async function main() {
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
  ui.onAddTemplate = async (name, category, content) => {
    await addTemplate({ name, category, content });
    const fresh = await getTemplates();
    ui.setData(fresh, categories);
    ui.goToList();
    showToast("✅ 模板已儲存");
  };

  ui.onDeleteTemplate = async (id) => {
    await deleteTemplate(id);
    const fresh = await getTemplates();
    ui.setData(fresh, categories);
    ui.goToList();
    showToast("🗑️ 模板已刪除");
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
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Re-detect adapter on navigation
      const newAdapter = detectAdapter();
      if (!newAdapter) {
        sidebar.classList.add("aps-hidden");
        toggleBtn.style.display = "none";
      } else {
        toggleBtn.style.display = "";
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // ── Listen for messages from popup/service-worker ──
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TOGGLE_SIDEBAR") {
      toggleSidebar();
    }
    if (msg.type === "SETTINGS_CHANGED") {
      // Reload settings and reapply theme
      getSettings().then((s) => {
        const newTheme = s.theme === "auto" ? adapter.getTheme() : s.theme;
        sidebar.classList.toggle("aps-dark", newTheme === "dark");
      });
    }
  });
})();
