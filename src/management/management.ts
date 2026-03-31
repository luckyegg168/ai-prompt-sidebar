/**
 * AI Prompt Sidebar — Management Page
 * 提示詞管理頁面主邏輯
 */

import {
  Template,
  Category,
  ScheduledTask,
  ScheduleType,
  PLATFORM_URLS,
  extractVariables,
  fillTemplate,
} from "../models/template";
import {
  getTemplates,
  getCategories,
  saveTemplates,
  saveCategories,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  initDefaults,
  getScheduledTasks,
  addScheduledTask,
  updateScheduledTask,
  deleteScheduledTask,
} from "../storage/templates";

// ── 狀態管理 ───────────────────────────────

interface AppState {
  templates: Template[];
  categories: Category[];
  scheduledTasks: ScheduledTask[];
  selectedTemplateId: string | null;
  searchQuery: string;
  selectedCategory: string;
  selectedTag: string;
  showFavoritesOnly: boolean;
  isDirty: boolean;
  darkMode: boolean;
}

const state: AppState = {
  templates: [],
  categories: [],
  scheduledTasks: [],
  selectedTemplateId: null,
  searchQuery: "",
  selectedCategory: "all",
  selectedTag: "all",
  showFavoritesOnly: false,
  isDirty: false,
  darkMode: false,
};

// 當前編輯中的模板（可能尚未儲存）
let currentEditingTemplate: Partial<Template> | null = null;

// ── DOM 元素參考 ───────────────────────────────

interface Elements {
  searchInput: HTMLInputElement | null;
  categoryFilter: HTMLSelectElement | null;
  tagFilter: HTMLSelectElement | null;
  favFilterBtn: HTMLElement | null;
  exportBtn: HTMLElement | null;
  importBtn: HTMLElement | null;
  schedulerBtn: HTMLElement | null;
  templateList: HTMLElement | null;
  templateCount: HTMLElement | null;
  newTemplateBtn: HTMLElement | null;
  closeBtn: HTMLElement | null;

  templateName: HTMLInputElement | null;
  templateCategory: HTMLSelectElement | null;
  templateTags: HTMLInputElement | null;
  templateContent: HTMLTextAreaElement | null;
  variableHints: HTMLElement | null;
  previewSection: HTMLElement | null;
  templatePreview: HTMLElement | null;
  unsavedIndicator: HTMLElement | null;

  previewToggleBtn: HTMLElement | null;
  duplicateBtn: HTMLElement | null;
  saveBtn: HTMLElement | null;
  deleteBtn: HTMLElement | null;

  addCategoryBtn: HTMLElement | null;
  categoryModalOverlay: HTMLElement | null;
  categoryModal: HTMLElement | null;
  categoryModalClose: HTMLElement | null;
  categoryList: HTMLElement | null;
  newCategoryName: HTMLInputElement | null;
  newCategoryIcon: HTMLInputElement | null;
  addCategoryConfirmBtn: HTMLElement | null;

  // 匯出 Modal
  exportModalOverlay: HTMLElement | null;
  exportModalClose: HTMLElement | null;
  exportCancelBtn: HTMLElement | null;
  exportConfirmBtn: HTMLElement | null;
  exportSelectionArea: HTMLElement | null;
  exportSelectAllCb: HTMLInputElement | null;
  exportSelectedCount: HTMLElement | null;
  exportCategoryTree: HTMLElement | null;

  // 匯入 Modal
  importModalOverlay: HTMLElement | null;
  importModal: HTMLElement | null;
  importModalClose: HTMLElement | null;
  importJson: HTMLTextAreaElement | null;
  importFileBtn: HTMLElement | null;
  importFileInput: HTMLInputElement | null;
  importCancelBtn: HTMLElement | null;
  importConfirmBtn: HTMLElement | null;

  // 定時發送 Modal
  schedulerModalOverlay: HTMLElement | null;
  schedulerModalClose: HTMLElement | null;
  addTaskBtn: HTMLElement | null;
  schedulerTaskList: HTMLElement | null;
  schedulerFormSection: HTMLElement | null;
  schedulerFormTitle: HTMLElement | null;
  schedulerTaskId: HTMLInputElement | null;
  taskName: HTMLInputElement | null;
  taskTemplate: HTMLSelectElement | null;
  taskVariablesGroup: HTMLElement | null;
  taskVariablesList: HTMLElement | null;
  taskPlatform: HTMLSelectElement | null;
  taskDatetime: HTMLInputElement | null;
  taskTime: HTMLInputElement | null;
  taskAutoSubmit: HTMLInputElement | null;
  scheduleOnceGroup: HTMLElement | null;
  scheduleRecurringGroup: HTMLElement | null;
  scheduleWeekdayGroup: HTMLElement | null;
  weekdayPicker: HTMLElement | null;
  schedulerFormCancel: HTMLElement | null;
  schedulerFormSave: HTMLElement | null;

  toastContainer: HTMLElement | null;
}

let els: Elements = {} as Elements;

function cacheElements() {
  els = {
    // 側邊欄
    searchInput: document.getElementById("search-input") as HTMLInputElement | null,
    categoryFilter: document.getElementById("category-filter") as HTMLSelectElement | null,
    tagFilter: document.getElementById("tag-filter") as HTMLSelectElement | null,
    favFilterBtn: document.getElementById("fav-filter-btn"),
    exportBtn: document.getElementById("export-btn"),
    importBtn: document.getElementById("import-btn"),
    schedulerBtn: document.getElementById("scheduler-btn"),
    templateList: document.getElementById("template-list"),
    templateCount: document.getElementById("template-count"),
    newTemplateBtn: document.getElementById("new-template-btn"),
    closeBtn: document.getElementById("close-btn"),

    // 編輯器
    templateName: document.getElementById("template-name") as HTMLInputElement | null,
    templateCategory: document.getElementById("template-category") as HTMLSelectElement | null,
    templateTags: document.getElementById("template-tags") as HTMLInputElement | null,
    templateContent: document.getElementById("template-content") as HTMLTextAreaElement | null,
    variableHints: document.getElementById("variable-hints"),
    previewSection: document.getElementById("preview-section"),
    templatePreview: document.getElementById("template-preview"),
    unsavedIndicator: document.getElementById("unsaved-indicator"),

    // 編輯器按鈕
    previewToggleBtn: document.getElementById("preview-toggle-btn"),
    duplicateBtn: document.getElementById("duplicate-btn"),
    saveBtn: document.getElementById("save-btn"),
    deleteBtn: document.getElementById("delete-btn"),

    // 分類管理
    addCategoryBtn: document.getElementById("add-category-btn"),
    categoryModalOverlay: document.getElementById("category-modal-overlay"),
    categoryModal: document.getElementById("category-modal"),
    categoryModalClose: document.getElementById("category-modal-close"),
    categoryList: document.getElementById("category-list"),
    newCategoryName: document.getElementById("new-category-name") as HTMLInputElement | null,
    newCategoryIcon: document.getElementById("new-category-icon") as HTMLInputElement | null,
    addCategoryConfirmBtn: document.getElementById("add-category-confirm-btn"),

    // 匯出 Modal
    exportModalOverlay: document.getElementById("export-modal-overlay"),
    exportModalClose: document.getElementById("export-modal-close"),
    exportCancelBtn: document.getElementById("export-cancel-btn"),
    exportConfirmBtn: document.getElementById("export-confirm-btn"),
    exportSelectionArea: document.getElementById("export-selection-area"),
    exportSelectAllCb: document.getElementById("export-select-all-cb") as HTMLInputElement | null,
    exportSelectedCount: document.getElementById("export-selected-count"),
    exportCategoryTree: document.getElementById("export-category-tree"),

    // 匯入 Modal
    importModalOverlay: document.getElementById("import-modal-overlay"),
    importModal: document.getElementById("import-modal"),
    importModalClose: document.getElementById("import-modal-close"),
    importJson: document.getElementById("import-json") as HTMLTextAreaElement | null,
    importFileBtn: document.getElementById("import-file-btn"),
    importFileInput: document.getElementById("import-file-input") as HTMLInputElement | null,
    importCancelBtn: document.getElementById("import-cancel-btn"),
    importConfirmBtn: document.getElementById("import-confirm-btn"),

    // 定時發送 Modal
    schedulerModalOverlay: document.getElementById("scheduler-modal-overlay"),
    schedulerModalClose: document.getElementById("scheduler-modal-close"),
    addTaskBtn: document.getElementById("add-task-btn"),
    schedulerTaskList: document.getElementById("scheduler-task-list"),
    schedulerFormSection: document.getElementById("scheduler-form-section"),
    schedulerFormTitle: document.getElementById("scheduler-form-title"),
    schedulerTaskId: document.getElementById("scheduler-task-id") as HTMLInputElement | null,
    taskName: document.getElementById("task-name") as HTMLInputElement | null,
    taskTemplate: document.getElementById("task-template") as HTMLSelectElement | null,
    taskVariablesGroup: document.getElementById("task-variables-group"),
    taskVariablesList: document.getElementById("task-variables-list"),
    taskPlatform: document.getElementById("task-platform") as HTMLSelectElement | null,
    taskDatetime: document.getElementById("task-datetime") as HTMLInputElement | null,
    taskTime: document.getElementById("task-time") as HTMLInputElement | null,
    taskAutoSubmit: document.getElementById("task-auto-submit") as HTMLInputElement | null,
    scheduleOnceGroup: document.getElementById("schedule-once-group"),
    scheduleRecurringGroup: document.getElementById("schedule-recurring-group"),
    scheduleWeekdayGroup: document.getElementById("schedule-weekday-group"),
    weekdayPicker: document.getElementById("weekday-picker"),
    schedulerFormCancel: document.getElementById("scheduler-form-cancel"),
    schedulerFormSave: document.getElementById("scheduler-form-save"),

    // Toast
    toastContainer: document.getElementById("toast-container"),
  };
}

// ── 初始化 ───────────────────────────────

async function init() {
  cacheElements();
  await loadData();
  setupEventListeners();
  applyTheme();
  render();

  // 監聽儲存變化
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
      if (changes.templates || changes.categories) {
        loadData().then(() => render());
      }
    }
  });

  // 未儲存提示
  window.addEventListener("beforeunload", (e) => {
    if (state.isDirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}

async function loadData() {
  try {
    const defaultsUrl = chrome.runtime.getURL("defaults.json");
    await initDefaults(defaultsUrl);

    state.templates = await getTemplates();
    state.categories = await getCategories();
    state.scheduledTasks = await getScheduledTasks();

    // 載入主題設定
    const result = await new Promise<{ settings?: { theme: string } }>(
      (resolve) => {
        chrome.storage.local.get("settings" as never, resolve);
      }
    );

    const theme = result.settings?.theme ?? "auto";
    if (theme === "dark") {
      state.darkMode = true;
    } else if (theme === "light") {
      state.darkMode = false;
    } else {
      // auto: 跟隨系統
      state.darkMode = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
    }
  } catch (error) {
    console.error("[Management] Failed to load data:", error);
    showToast("載入資料失敗", true);
  }
}

// ── 事件監聽 ───────────────────────────────

function setupEventListeners() {
  // 搜尋
  els.searchInput?.addEventListener("input", (e) => {
    state.searchQuery = (e.target as HTMLInputElement).value;
    renderTemplateList();
  });

  // 分類篩選
  els.categoryFilter?.addEventListener("change", (e) => {
    state.selectedCategory = (e.target as HTMLSelectElement).value;
    renderTemplateList();
  });

  // 標籤篩選
  els.tagFilter?.addEventListener("change", (e) => {
    state.selectedTag = (e.target as HTMLSelectElement).value;
    renderTemplateList();
  });

  // 收藏篩選
  els.favFilterBtn?.addEventListener("click", () => {
    state.showFavoritesOnly = !state.showFavoritesOnly;
    els.favFilterBtn?.classList.toggle("active", state.showFavoritesOnly);
    renderTemplateList();
  });

  // 匯出
  els.exportBtn?.addEventListener("click", openExportModal);

  // 匯出 Modal
  els.exportModalClose?.addEventListener("click", closeExportModal);
  els.exportCancelBtn?.addEventListener("click", closeExportModal);
  els.exportConfirmBtn?.addEventListener("click", handleExportConfirm);

  document.querySelectorAll('input[name="export-mode"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const mode = (e.target as HTMLInputElement).value;
      const showSelection = mode === "by-category" || mode === "selected";
      els.exportSelectionArea?.classList.toggle("hidden", !showSelection);
      if (showSelection) updateExportSelectedCount();
    });
  });

  els.exportSelectAllCb?.addEventListener("change", (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    els.exportCategoryTree?.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach((cb) => {
      cb.checked = checked;
    });
    updateExportSelectedCount();
  });

  // 匯入
  els.importBtn?.addEventListener("click", () => {
    els.importModalOverlay?.classList.add("visible");
  });

  els.importModalClose?.addEventListener("click", closeImportModal);
  els.importCancelBtn?.addEventListener("click", closeImportModal);

  els.importFileBtn?.addEventListener("click", () => {
    els.importFileInput?.click();
  });

  els.importFileInput?.addEventListener("change", handleFileSelect);

  els.importConfirmBtn?.addEventListener("click", handleImport);

  // 定時發送
  els.schedulerBtn?.addEventListener("click", openSchedulerModal);
  els.schedulerModalClose?.addEventListener("click", closeSchedulerModal);

  els.addTaskBtn?.addEventListener("click", () => {
    openSchedulerForm(null);
  });

  els.schedulerFormCancel?.addEventListener("click", () => {
    els.schedulerFormSection?.classList.add("hidden");
  });

  els.schedulerFormSave?.addEventListener("click", handleSaveTask);

  document.querySelectorAll('input[name="schedule-type"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      updateScheduleTypeUI((e.target as HTMLInputElement).value as ScheduleType);
    });
  });

  els.weekdayPicker?.querySelectorAll(".weekday-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
    });
  });

  els.taskTemplate?.addEventListener("change", () => {
    renderTaskVariables();
  });

  // 新增模板
  els.newTemplateBtn?.addEventListener("click", () => {
    createNewTemplate();
  });

  // 關閉按鈕（返回 extension）
  els.closeBtn?.addEventListener("click", () => {
    window.close();
  });

  // 編輯器事件
  els.templateName?.addEventListener("input", markDirty);
  els.templateCategory?.addEventListener("change", markDirty);
  els.templateTags?.addEventListener("input", markDirty);
  els.templateContent?.addEventListener("input", () => {
    markDirty();
    updateVariableHints();
  });

  // 預覽切換
  els.previewToggleBtn?.addEventListener("click", () => {
    els.previewSection?.classList.toggle("hidden");
    renderPreview();
  });

  // 儲存
  els.saveBtn?.addEventListener("click", handleSave);

  // 刪除
  els.deleteBtn?.addEventListener("click", handleDelete);

  // 複製
  els.duplicateBtn?.addEventListener("click", handleDuplicate);

  // 分類管理
  els.addCategoryBtn?.addEventListener("click", () => {
    els.categoryModalOverlay?.classList.add("visible");
    renderCategoryList();
  });

  els.categoryModalClose?.addEventListener("click", () => {
    els.categoryModalOverlay?.classList.remove("visible");
  });

  els.addCategoryConfirmBtn?.addEventListener("click", handleAddCategory);

  // 快捷鍵
  document.addEventListener("keydown", (e) => {
    // Ctrl+S / Cmd+S: 儲存
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    // Ctrl+N / Cmd+N: 新增
    if ((e.ctrlKey || e.metaKey) && e.key === "n") {
      e.preventDefault();
      createNewTemplate();
    }
    // Escape: 關閉 Modal
    if (e.key === "Escape") {
      els.categoryModalOverlay?.classList.remove("visible");
      closeImportModal();
      closeExportModal();
      closeSchedulerModal();
    }
  });
}

// ── 渲染 ───────────────────────────────

function render() {
  applyTheme();
  renderFilterOptions();
  renderTemplateList();
  renderCategorySelect();
  updateVariableHints();

  if (state.selectedTemplateId) {
    const template = state.templates.find(
      (t) => t.id === state.selectedTemplateId
    );
    if (template) {
      loadTemplateToEditor(template);
    }
  } else {
    clearEditor();
  }
}

function applyTheme() {
  if (state.darkMode) {
    document.body.classList.add("mgmt-dark");
  } else {
    document.body.classList.remove("mgmt-dark");
  }
}

function renderFilterOptions() {
  // 分類篩選
  const categoryFilter = els.categoryFilter as HTMLSelectElement;
  if (categoryFilter) {
    categoryFilter.innerHTML = '<option value="all">全部分類</option>';
    for (const cat of state.categories) {
      const option = document.createElement("option");
      option.value = cat.name;
      option.textContent = `${cat.icon} ${cat.name}`;
      categoryFilter.appendChild(option);
    }
  }

  // 標籤篩選
  const tagFilter = els.tagFilter as HTMLSelectElement;
  if (tagFilter) {
    const allTags = new Set<string>();
    for (const tpl of state.templates) {
      for (const tag of tpl.tags ?? []) {
        allTags.add(tag);
      }
    }

    tagFilter.innerHTML = '<option value="all">全部標籤</option>';
    for (const tag of Array.from(allTags).sort()) {
      const option = document.createElement("option");
      option.value = tag;
      option.textContent = tag;
      tagFilter.appendChild(option);
    }
  }

  // 模板計數
  if (els.templateCount) {
    els.templateCount.textContent = `${state.templates.length} 個模板`;
  }
}

function renderTemplateList() {
  const container = els.templateList;
  if (!container) return;

  let filtered = state.templates;

  // 分類篩選
  if (state.selectedCategory !== "all") {
    filtered = filtered.filter((t) => t.category === state.selectedCategory);
  }

  // 標籤篩選
  if (state.selectedTag !== "all") {
    filtered = filtered.filter((t) => t.tags?.includes(state.selectedTag));
  }

  // 收藏篩選
  if (state.showFavoritesOnly) {
    filtered = filtered.filter((t) => t.isFavorite);
  }

  // 搜尋
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
    );
  }

  // 收藏優先
  filtered.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">找不到符合的模板</div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map(
      (tpl) => `
      <div class="template-card ${tpl.id === state.selectedTemplateId ? "active" : ""}" 
           data-id="${tpl.id}">
        <div class="template-card-header">
          <span class="template-card-name">${escapeHtml(tpl.name)}</span>
          <button class="template-card-star ${tpl.isFavorite ? "active" : ""}" 
                  data-id="${tpl.id}" 
                  title="${tpl.isFavorite ? "取消收藏" : "加入收藏"}">
            ${tpl.isFavorite ? "★" : "☆"}
          </button>
        </div>
        <div class="template-card-preview">${escapeHtml(tpl.content.slice(0, 80))}${tpl.content.length > 80 ? "…" : ""}</div>
        ${tpl.tags && tpl.tags.length > 0 ? `
          <div class="template-card-tags">
            ${tpl.tags.slice(0, 3).map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join("")}
            ${tpl.tags.length > 3 ? `<span class="tag-pill">+${tpl.tags.length - 3}</span>` : ""}
          </div>
        ` : ""}
      </div>
    `
    )
    .join("");

  // 綁定點擊事件
  container.querySelectorAll(".template-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("template-card-star")) {
        e.stopPropagation();
        toggleFavorite(target.getAttribute("data-id")!);
      } else {
        selectTemplate(card.getAttribute("data-id")!);
      }
    });
  });
}

function renderCategorySelect() {
  const select = els.templateCategory as HTMLSelectElement;
  if (!select) return;

  select.innerHTML = state.categories
    .map((cat) => `<option value="${cat.name}">${cat.icon} ${cat.name}</option>`)
    .join("");
}

function renderCategoryList() {
  const container = els.categoryList;
  if (!container) return;

  if (state.categories.length === 0) {
    container.innerHTML = '<div class="empty-state">尚無分類</div>';
    return;
  }

  container.innerHTML = state.categories
    .map(
      (cat) => `
      <div class="category-item" data-id="${cat.id}">
        <div class="category-item-info">
          <span class="category-item-icon">${cat.icon}</span>
          <span class="category-item-name">${escapeHtml(cat.name)}</span>
        </div>
        <div class="category-item-actions">
          <button class="edit-category-btn" data-id="${cat.id}" title="編輯">✏️</button>
          <button class="delete-category-btn delete" data-id="${cat.id}" title="刪除">🗑️</button>
        </div>
      </div>
    `
    )
    .join("");

  // 綁定事件
  container.querySelectorAll(".edit-category-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const catId = btn.getAttribute("data-id");
      const cat = state.categories.find((c) => c.id === catId);
      if (cat) {
        const newName = prompt("分類名稱:", cat.name);
        const newIcon = prompt("分類圖示 (emoji):", cat.icon);
        if (newName && newIcon) {
          updateCategory(cat.id, { name: newName, icon: newIcon });
        }
      }
    });
  });

  container.querySelectorAll(".delete-category-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const catId = btn.getAttribute("data-id");
      const cat = state.categories.find((c) => c.id === catId);
      if (cat && confirm(`確定刪除分類「${cat.name}」？`)) {
        deleteCategory(cat.id);
      }
    });
  });
}

function updateVariableHints() {
  const container = els.variableHints;
  if (!container) return;

  const content = (els.templateContent as HTMLTextAreaElement)?.value ?? "";
  const variables = extractVariables(content);

  if (variables.length === 0) {
    container.innerHTML =
      '<div class="empty-state" style="padding: 8px;">尚未偵測到變數，使用 {{變數名稱}} 格式新增</div>';
    return;
  }

  container.innerHTML = variables
    .map(
      (v) => `
      <span class="variable-hint">
        <span class="var-name">{{${escapeHtml(v.name)}}}</span>
      </span>
    `
    )
    .join("");
}

function renderPreview() {
  const container = els.templatePreview;
  if (!container) return;

  const content = (els.templateContent as HTMLTextAreaElement)?.value ?? "";
  const variables = extractVariables(content);

  if (variables.length === 0) {
    container.innerHTML =
      '<div class="preview-placeholder">沒有變數可預覽</div>';
    return;
  }

  // 使用預設值或變數名稱填入
  const values: Record<string, string> = {};
  for (const v of variables) {
    values[v.name] = v.defaultValue || `[${v.name}]`;
  }

  const filled = fillTemplate(content, values);
  container.textContent = filled;
}

// ── 模板操作 ───────────────────────────────

function selectTemplate(id: string) {
  // 檢查未儲存
  if (state.isDirty && !confirm("有未儲存的變更，確定要放棄嗎？")) {
    return;
  }

  state.selectedTemplateId = id;
  const template = state.templates.find((t) => t.id === id);
  if (template) {
    loadTemplateToEditor(template);
  }
  renderTemplateList();
}

function loadTemplateToEditor(template: Template) {
  currentEditingTemplate = { ...template };

  if (els.templateName) els.templateName.value = template.name;
  if (els.templateCategory)
    els.templateCategory.value = template.category;
  if (els.templateTags)
    els.templateTags.value = template.tags?.join(", ") ?? "";
  if (els.templateContent) els.templateContent.value = template.content;

  state.isDirty = false;
  updateUnsavedIndicator();
  updateVariableHints();
}

function clearEditor() {
  currentEditingTemplate = null;
  state.selectedTemplateId = null;

  if (els.templateName) els.templateName.value = "";
  if (els.templateCategory) els.templateCategory.value = "";
  if (els.templateTags) els.templateTags.value = "";
  if (els.templateContent) els.templateContent.value = "";

  state.isDirty = false;
  updateUnsavedIndicator();
  updateVariableHints();
  renderTemplateList();
}

function createNewTemplate() {
  if (state.isDirty && !confirm("有未儲存的變更，確定要放棄嗎？")) {
    return;
  }

  currentEditingTemplate = {
    name: "新模板",
    category: state.categories[0]?.name ?? "自訂",
    content: "",
    tags: [],
    isFavorite: false,
  };

  state.selectedTemplateId = null;
  loadTemplateToEditor(currentEditingTemplate as Template);
  els.templateName?.focus();
  els.templateName?.select();
}

function markDirty() {
  state.isDirty = true;
  updateUnsavedIndicator();
}

function updateUnsavedIndicator() {
  if (els.unsavedIndicator) {
    els.unsavedIndicator.classList.toggle("visible", state.isDirty);
  }
}

async function handleSave() {
  if (!currentEditingTemplate) {
    showToast("沒有可儲存的模板", true);
    return;
  }

  const name = (els.templateName as HTMLInputElement)?.value.trim();
  const category = (els.templateCategory as HTMLSelectElement)?.value;
  const tagsStr = (els.templateTags as HTMLInputElement)?.value.trim();
  const content = (els.templateContent as HTMLTextAreaElement)?.value.trim();

  if (!name || !content) {
    showToast("請填寫模板名稱和內容", true);
    return;
  }

  const tags = tagsStr
    ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  try {
    if (currentEditingTemplate.id) {
      // 更新現有模板
      await updateTemplate(currentEditingTemplate.id, {
        name,
        category,
        content,
        tags,
      });
      showToast("✅ 模板已更新");
    } else {
      // 新增模板
      await addTemplate({
        name,
        category,
        content,
        tags,
        isFavorite: false,
      });
      showToast("✅ 模板已新增");
    }

    await loadData();
    render();
    state.isDirty = false;
    updateUnsavedIndicator();
  } catch (error) {
    console.error("[Management] Failed to save:", error);
    showToast("儲存失敗", true);
  }
}

async function handleDelete() {
  if (!currentEditingTemplate?.id) {
    showToast("沒有可刪除的模板", true);
    return;
  }

  if (!confirm(`確定刪除「${currentEditingTemplate.name}」？`)) {
    return;
  }

  try {
    await deleteTemplate(currentEditingTemplate.id);
    showToast("🗑️ 模板已刪除");
    await loadData();
    clearEditor();
  } catch (error) {
    console.error("[Management] Failed to delete:", error);
    showToast("刪除失敗", true);
  }
}

async function handleDuplicate() {
  if (!currentEditingTemplate) {
    showToast("沒有可複製的模板", true);
    return;
  }

  try {
    await addTemplate({
      name: `${currentEditingTemplate.name} (複製)`,
      category: currentEditingTemplate.category ?? "",
      content: currentEditingTemplate.content ?? "",
      tags: currentEditingTemplate.tags ?? [],
      isFavorite: false,
    });
    showToast("📄 模板已複製");
    await loadData();
    render();
  } catch (error) {
    console.error("[Management] Failed to duplicate:", error);
    showToast("複製失敗", true);
  }
}

async function toggleFavorite(id: string) {
  const template = state.templates.find((t) => t.id === id);
  if (!template) return;

  try {
    await updateTemplate(id, { isFavorite: !template.isFavorite });
    await loadData();
    render();
  } catch (error) {
    console.error("[Management] Failed to toggle favorite:", error);
  }
}

// ── 分類管理 ───────────────────────────────

async function handleAddCategory() {
  const name = (els.newCategoryName as HTMLInputElement)?.value.trim();
  const icon = (els.newCategoryIcon as HTMLInputElement)?.value.trim() || "📁";

  if (!name) {
    showToast("請輸入分類名稱", true);
    return;
  }

  try {
    const newCategory: Category = {
      id: crypto.randomUUID(),
      name,
      icon,
      order: state.categories.length,
    };

    await saveCategories([...state.categories, newCategory]);
    await loadData();
    render();

    // 清空表單
    if (els.newCategoryName) els.newCategoryName.value = "";
    if (els.newCategoryIcon) els.newCategoryIcon.value = "";

    els.categoryModalOverlay?.classList.remove("visible");
    showToast("✅ 分類已新增");
  } catch (error) {
    console.error("[Management] Failed to add category:", error);
    showToast("新增分類失敗", true);
  }
}

async function updateCategory(id: string, updates: Partial<Category>) {
  try {
    const categories = state.categories.map((cat) =>
      cat.id === id ? { ...cat, ...updates } : cat
    );
    await saveCategories(categories);
    await loadData();
    render();
    showToast("✅ 分類已更新");
  } catch (error) {
    console.error("[Management] Failed to update category:", error);
    showToast("更新分類失敗", true);
  }
}

async function deleteCategory(id: string) {
  try {
    const categories = state.categories.filter((cat) => cat.id !== id);
    await saveCategories(categories);
    await loadData();
    render();
    showToast("🗑️ 分類已刪除");
  } catch (error) {
    console.error("[Management] Failed to delete category:", error);
    showToast("刪除分類失敗", true);
  }
}

// ── 匯入/匯出 ───────────────────────────────

// ── 匯出 Modal ───────────────────────────────

function openExportModal() {
  // Reset to "all" mode
  const allRadio = document.querySelector<HTMLInputElement>('input[name="export-mode"][value="all"]');
  if (allRadio) allRadio.checked = true;
  els.exportSelectionArea?.classList.add("hidden");
  renderExportCategoryTree();
  els.exportModalOverlay?.classList.add("visible");
}

function closeExportModal() {
  els.exportModalOverlay?.classList.remove("visible");
}

function renderExportCategoryTree() {
  const tree = els.exportCategoryTree;
  if (!tree) return;

  const byCategory = new Map<string, Template[]>();
  for (const tpl of state.templates) {
    const arr = byCategory.get(tpl.category) ?? [];
    arr.push(tpl);
    byCategory.set(tpl.category, arr);
  }

  tree.innerHTML = Array.from(byCategory.entries())
    .map(([catName, templates]) => {
      const cat = state.categories.find((c) => c.name === catName);
      const icon = cat?.icon ?? "📁";
      const catId = `export-cat-${catName.replace(/\s+/g, "_")}`;
      return `
        <div class="export-category-node">
          <label class="export-category-label">
            <input type="checkbox" class="export-cat-cb" data-cat="${escapeHtml(catName)}" id="${catId}" checked />
            <span>${icon} ${escapeHtml(catName)} (${templates.length})</span>
          </label>
          <div class="export-template-list">
            ${templates.map((tpl) => `
              <label class="export-template-label">
                <input type="checkbox" class="export-tpl-cb" data-id="${tpl.id}" data-cat="${escapeHtml(catName)}" checked />
                <span class="export-tpl-name">${escapeHtml(tpl.name)}</span>
              </label>
            `).join("")}
          </div>
        </div>
      `;
    })
    .join("");

  // Category checkbox toggles its templates
  tree.querySelectorAll<HTMLInputElement>(".export-cat-cb").forEach((catCb) => {
    catCb.addEventListener("change", () => {
      const cat = catCb.dataset.cat;
      tree.querySelectorAll<HTMLInputElement>(`.export-tpl-cb[data-cat="${cat}"]`).forEach((cb) => {
        cb.checked = catCb.checked;
      });
      updateExportSelectedCount();
    });
  });
  tree.querySelectorAll<HTMLInputElement>(".export-tpl-cb").forEach((cb) => {
    cb.addEventListener("change", () => updateExportSelectedCount());
  });

  updateExportSelectedCount();
}

function updateExportSelectedCount() {
  const checked = els.exportCategoryTree?.querySelectorAll<HTMLInputElement>(".export-tpl-cb:checked").length ?? 0;
  if (els.exportSelectedCount) {
    els.exportSelectedCount.textContent = `已選 ${checked} 個`;
  }
  // Sync select-all checkbox
  const total = els.exportCategoryTree?.querySelectorAll<HTMLInputElement>(".export-tpl-cb").length ?? 0;
  if (els.exportSelectAllCb) {
    els.exportSelectAllCb.checked = checked === total && total > 0;
    els.exportSelectAllCb.indeterminate = checked > 0 && checked < total;
  }
}

function handleExportConfirm() {
  const mode = document.querySelector<HTMLInputElement>('input[name="export-mode"]:checked')?.value ?? "all";

  if (mode === "all") {
    downloadJson(
      { categories: state.categories, templates: state.templates },
      `ai-prompts-${dateStamp()}.json`
    );
    closeExportModal();
    showToast(`📤 已匯出全部 ${state.templates.length} 個模板`);
    return;
  }

  const selectedIds = new Set(
    Array.from(
      els.exportCategoryTree?.querySelectorAll<HTMLInputElement>(".export-tpl-cb:checked") ?? []
    ).map((cb) => cb.dataset.id ?? "")
  );

  if (selectedIds.size === 0) {
    showToast("請至少選擇一個模板", true);
    return;
  }

  const selectedTemplates = state.templates.filter((t) => selectedIds.has(t.id));

  if (mode === "selected") {
    const usedCatNames = new Set(selectedTemplates.map((t) => t.category));
    const usedCategories = state.categories.filter((c) => usedCatNames.has(c.name));
    downloadJson(
      { categories: usedCategories, templates: selectedTemplates },
      `ai-prompts-selected-${dateStamp()}.json`
    );
    closeExportModal();
    showToast(`📤 已匯出 ${selectedTemplates.length} 個模板`);
    return;
  }

  // by-category: export one file per checked category
  const selectedCatNames = new Set(
    Array.from(
      els.exportCategoryTree?.querySelectorAll<HTMLInputElement>(".export-cat-cb:checked") ?? []
    ).map((cb) => cb.dataset.cat ?? "")
  );

  if (selectedCatNames.size === 0) {
    showToast("請至少選擇一個分類", true);
    return;
  }

  let totalExported = 0;
  for (const catName of selectedCatNames) {
    const cat = state.categories.find((c) => c.name === catName);
    const templates = selectedTemplates.filter((t) => t.category === catName);
    if (templates.length === 0) continue;
    downloadJson(
      { categories: cat ? [cat] : [], templates },
      `ai-prompts-${catName.replace(/\s+/g, "_")}-${dateStamp()}.json`
    );
    totalExported += templates.length;
  }
  closeExportModal();
  showToast(`📤 已匯出 ${totalExported} 個模板 (${selectedCatNames.size} 個分類)`);
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dateStamp() {
  return new Date().toISOString().split("T")[0];
}

// ── 匯入 ───────────────────────────────

function closeImportModal() {
  els.importModalOverlay?.classList.remove("visible");
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    if (els.importJson) {
      els.importJson.value = String(reader.result);
    }
  };
  reader.readAsText(file);
}

async function handleImport() {
  const jsonStr = els.importJson?.value.trim();
  if (!jsonStr) {
    showToast("請輸入或選擇 JSON 檔案", true);
    return;
  }

  const importMode = document.querySelector<HTMLInputElement>('input[name="import-mode"]:checked')?.value ?? "merge";

  try {
    const data = JSON.parse(jsonStr);
    if (!Array.isArray(data.templates)) throw new Error("無效的模板格式");

    const now = Date.now();
    const imported: Template[] = data.templates.map((t: Record<string, unknown>) => ({
      id: String(t.id ?? crypto.randomUUID()),
      name: String(t.name ?? ""),
      category: String(t.category ?? "自訂"),
      content: String(t.content ?? ""),
      variables: extractVariables(String(t.content ?? "")),
      tags: Array.isArray(t.tags) ? t.tags.map(String) : [],
      isFavorite: Boolean(t.isFavorite),
      createdAt: Number(t.createdAt) || now,
      updatedAt: now,
    }));

    let finalTemplates: Template[];
    if (importMode === "replace-all") {
      finalTemplates = imported;
    } else if (importMode === "overwrite") {
      const map = new Map(state.templates.map((t) => [t.id, t]));
      for (const t of imported) map.set(t.id, t);
      finalTemplates = Array.from(map.values());
    } else {
      // merge: keep existing, add only new IDs
      const existingIds = new Set(state.templates.map((t) => t.id));
      const newOnes = imported
        .filter((t) => !existingIds.has(t.id))
        .map((t) => ({ ...t, id: crypto.randomUUID() }));
      finalTemplates = [...state.templates, ...newOnes];
    }

    await saveTemplates(finalTemplates);

    if (Array.isArray(data.categories)) {
      const existingNames = new Set(state.categories.map((c) => c.name));
      const newCategories = (data.categories as Record<string, unknown>[]).filter((c) =>
        typeof c.id === "string" &&
        typeof c.name === "string" &&
        typeof c.icon === "string" &&
        typeof c.order === "number" &&
        !existingNames.has(c.name as string)
      ) as unknown as Category[];
      if (newCategories.length > 0) {
        await saveCategories([...state.categories, ...newCategories]);
      }
    }

    await loadData();
    render();
    closeImportModal();
    if (els.importJson) els.importJson.value = "";

    const delta = finalTemplates.length - state.templates.length;
    showToast(`📥 匯入完成 (${importMode === "merge" ? `新增 ${Math.abs(delta)}` : `共 ${finalTemplates.length}`} 個模板)`);
  } catch (error) {
    console.error("[Management] Failed to import:", error);
    showToast("匯入失敗，請檢查 JSON 格式", true);
  }
}

// ── 定時發送 ───────────────────────────────

function openSchedulerModal() {
  renderSchedulerTasks();
  populateTaskTemplateSelect();
  els.schedulerFormSection?.classList.add("hidden");
  els.schedulerModalOverlay?.classList.add("visible");
}

function closeSchedulerModal() {
  els.schedulerModalOverlay?.classList.remove("visible");
}

function populateTaskTemplateSelect() {
  const sel = els.taskTemplate;
  if (!sel) return;
  sel.innerHTML = '<option value="">— 選擇模板 —</option>' +
    state.templates.map((t) =>
      `<option value="${t.id}">${escapeHtml(t.name)}</option>`
    ).join("");
}

function renderSchedulerTasks() {
  const container = els.schedulerTaskList;
  if (!container) return;

  if (state.scheduledTasks.length === 0) {
    container.innerHTML = '<div class="empty-state">尚無排程任務</div>';
    return;
  }

  container.innerHTML = state.scheduledTasks.map((task) => {
    const tpl = state.templates.find((t) => t.id === task.templateId);
    const scheduleDesc = formatScheduleDesc(task);
    return `
      <div class="scheduler-task-item ${task.enabled ? "" : "disabled"}" data-id="${task.id}">
        <div class="scheduler-task-info">
          <div class="scheduler-task-name">${escapeHtml(task.name)}</div>
          <div class="scheduler-task-meta">
            <span>${PLATFORM_URLS[task.platform] ? task.platform : task.platform}</span>
            <span>·</span>
            <span>${escapeHtml(tpl?.name ?? "(已刪除)")}</span>
            <span>·</span>
            <span>${scheduleDesc}</span>
          </div>
        </div>
        <div class="scheduler-task-actions">
          <label class="toggle-switch" title="${task.enabled ? "停用" : "啟用"}">
            <input type="checkbox" class="task-toggle-cb" data-id="${task.id}" ${task.enabled ? "checked" : ""} />
            <span class="toggle-slider"></span>
          </label>
          <button class="edit-task-btn icon-btn" data-id="${task.id}" title="編輯">✏️</button>
          <button class="delete-task-btn icon-btn delete" data-id="${task.id}" title="刪除">🗑️</button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".task-toggle-cb").forEach((cb) => {
    cb.addEventListener("change", async (e) => {
      const id = (e.target as HTMLInputElement).dataset.id!;
      const enabled = (e.target as HTMLInputElement).checked;
      await handleToggleTask(id, enabled);
    });
  });
  container.querySelectorAll(".edit-task-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = (btn as HTMLElement).dataset.id!;
      const task = state.scheduledTasks.find((t) => t.id === id);
      if (task) openSchedulerForm(task);
    });
  });
  container.querySelectorAll(".delete-task-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = (btn as HTMLElement).dataset.id!;
      handleDeleteTask(id);
    });
  });
}

function formatScheduleDesc(task: ScheduledTask): string {
  if (task.scheduleType === "once") {
    return `一次性 ${new Date(task.nextRunAt).toLocaleString("zh-TW")}`;
  }
  if (task.scheduleType === "weekly") {
    const days = ["日","一","二","三","四","五","六"];
    const daysStr = (task.weekdays ?? []).map((d) => days[d]).join("、");
    return `每週 ${daysStr} ${task.scheduleTime}`;
  }
  return `每天 ${task.scheduleTime}`;
}

function openSchedulerForm(task: ScheduledTask | null) {
  const isEdit = task !== null;
  if (els.schedulerFormTitle) {
    els.schedulerFormTitle.textContent = isEdit ? "編輯排程任務" : "新增排程任務";
  }
  if (els.schedulerTaskId) els.schedulerTaskId.value = task?.id ?? "";
  if (els.taskName) els.taskName.value = task?.name ?? "";
  if (els.taskTemplate) els.taskTemplate.value = task?.templateId ?? "";
  if (els.taskPlatform) els.taskPlatform.value = task?.platform ?? "grok";
  if (els.taskAutoSubmit) els.taskAutoSubmit.checked = task?.autoSubmit ?? false;

  // Schedule type
  const schedType: ScheduleType = task?.scheduleType ?? "once";
  const radio = document.querySelector<HTMLInputElement>(`input[name="schedule-type"][value="${schedType}"]`);
  if (radio) radio.checked = true;
  updateScheduleTypeUI(schedType);

  if (schedType === "once") {
    if (els.taskDatetime && task?.nextRunAt) {
      const d = new Date(task.nextRunAt);
      const pad = (n: number) => String(n).padStart(2, "0");
      els.taskDatetime.value =
        `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  } else {
    if (els.taskTime) els.taskTime.value = task?.scheduleTime ?? "09:00";
  }

  // Weekdays
  els.weekdayPicker?.querySelectorAll<HTMLElement>(".weekday-btn").forEach((btn) => {
    const day = parseInt(btn.dataset.day ?? "0");
    btn.classList.toggle("active", task?.weekdays?.includes(day) ?? false);
  });

  renderTaskVariables();
  if (task?.variables) {
    // Fill variable inputs with saved values
    const list = els.taskVariablesList;
    if (list) {
      list.querySelectorAll<HTMLInputElement>(".task-var-input").forEach((input) => {
        const v = input.dataset.varname ?? "";
        if (task.variables[v] !== undefined) input.value = task.variables[v];
      });
    }
  }

  els.schedulerFormSection?.classList.remove("hidden");
  els.taskName?.focus();
}

function renderTaskVariables() {
  const sel = els.taskTemplate;
  const group = els.taskVariablesGroup;
  const list = els.taskVariablesList;
  if (!sel || !group || !list) return;

  const tplId = sel.value;
  const tpl = state.templates.find((t) => t.id === tplId);
  const vars = tpl ? extractVariables(tpl.content) : [];

  if (vars.length === 0) {
    group.style.display = "none";
    return;
  }

  group.style.display = "";
  list.innerHTML = vars.map((v) => `
    <div class="task-var-row">
      <label>${escapeHtml(v.name)}</label>
      <input type="text" class="task-var-input" data-varname="${escapeHtml(v.name)}"
             placeholder="${escapeHtml(v.placeholder ?? v.name)}"
             value="${escapeHtml(v.defaultValue ?? "")}" />
    </div>
  `).join("");
}

function updateScheduleTypeUI(type: ScheduleType) {
  els.scheduleOnceGroup?.classList.toggle("hidden", type !== "once");
  els.scheduleRecurringGroup?.classList.toggle("hidden", type === "once");
  els.scheduleWeekdayGroup?.classList.toggle("hidden", type !== "weekly");
}

async function handleSaveTask() {
  const name = els.taskName?.value.trim();
  const templateId = els.taskTemplate?.value;
  const platform = els.taskPlatform?.value as ScheduledTask["platform"];
  const autoSubmit = els.taskAutoSubmit?.checked ?? false;
  const scheduleType = (document.querySelector<HTMLInputElement>('input[name="schedule-type"]:checked')?.value ?? "once") as ScheduleType;
  const existingId = els.schedulerTaskId?.value;

  if (!name || !templateId) {
    showToast("請填寫任務名稱並選擇模板", true);
    return;
  }

  // Collect variables
  const variables: Record<string, string> = {};
  els.taskVariablesList?.querySelectorAll<HTMLInputElement>(".task-var-input").forEach((inp) => {
    variables[inp.dataset.varname ?? ""] = inp.value;
  });

  // Compute nextRunAt
  let scheduleTime = "";
  let weekdays: number[] = [];
  let nextRunAt = 0;

  if (scheduleType === "once") {
    const dt = els.taskDatetime?.value;
    if (!dt) { showToast("請選擇執行時間", true); return; }
    nextRunAt = new Date(dt).getTime();
    scheduleTime = new Date(dt).toISOString();
    if (nextRunAt <= Date.now()) { showToast("執行時間必須在未來", true); return; }
  } else {
    scheduleTime = els.taskTime?.value ?? "09:00";
    const [h, m] = scheduleTime.split(":").map(Number);
    if (scheduleType === "weekly") {
      weekdays = Array.from(
        els.weekdayPicker?.querySelectorAll<HTMLElement>(".weekday-btn.active") ?? []
      ).map((btn) => parseInt(btn.dataset.day ?? "0"));
      if (weekdays.length === 0) { showToast("請至少選擇一天", true); return; }
    }
    const now = new Date();
    const candidate = new Date();
    candidate.setHours(h, m, 0, 0);
    if (candidate.getTime() <= now.getTime()) candidate.setDate(candidate.getDate() + 1);
    nextRunAt = candidate.getTime();
  }

  try {
    const payload: Omit<ScheduledTask, "id" | "createdAt"> = {
      name,
      templateId,
      platform,
      variables,
      scheduleType,
      scheduleTime,
      weekdays,
      autoSubmit,
      enabled: true,
      nextRunAt,
    };

    let savedTask: ScheduledTask;
    if (existingId) {
      await updateScheduledTask(existingId, payload);
      savedTask = { ...payload, id: existingId, createdAt: Date.now() };
    } else {
      savedTask = await addScheduledTask(payload);
    }

    // Notify service worker to register alarm
    safeSend({ type: "SCHEDULE_TASK", task: savedTask });

    state.scheduledTasks = await getScheduledTasks();
    renderSchedulerTasks();
    els.schedulerFormSection?.classList.add("hidden");
    showToast(`⏰ 排程任務已${existingId ? "更新" : "新增"}`);
  } catch (error) {
    console.error("[Management] Failed to save task:", error);
    showToast("儲存失敗", true);
  }
}

async function handleDeleteTask(id: string) {
  const task = state.scheduledTasks.find((t) => t.id === id);
  if (!task) return;
  if (!confirm(`確定刪除「${task.name}」？`)) return;

  try {
    await deleteScheduledTask(id);
    safeSend({ type: "CANCEL_TASK", taskId: id });
    state.scheduledTasks = await getScheduledTasks();
    renderSchedulerTasks();
    showToast("🗑️ 排程任務已刪除");
  } catch (error) {
    console.error("[Management] Failed to delete task:", error);
    showToast("刪除失敗", true);
  }
}

async function handleToggleTask(id: string, enabled: boolean) {
  try {
    await updateScheduledTask(id, { enabled });
    if (enabled) {
      const task = state.scheduledTasks.find((t) => t.id === id);
      if (task) safeSend({ type: "SCHEDULE_TASK", task: { ...task, enabled: true } });
    } else {
      safeSend({ type: "CANCEL_TASK", taskId: id });
    }
    state.scheduledTasks = await getScheduledTasks();
    renderSchedulerTasks();
    showToast(`⏰ 任務已${enabled ? "啟用" : "停用"}`);
  } catch (error) {
    console.error("[Management] Failed to toggle task:", error);
  }
}

// ── 工具函式 ───────────────────────────────

/** Fire-and-forget sendMessage that silences the "Receiving end does not exist" error
 *  which occurs normally when the service worker is sleeping. */
function safeSend(msg: object): void {
  chrome.runtime.sendMessage(msg).catch(() => {
    // SW may be sleeping; alarm scheduling is persisted via storage and will
    // be re-registered by scheduleAllEnabledTasks() on next SW wake.
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message: string, isError = false): void {
  const container = els.toastContainer;
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast${isError ? " error" : ""}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ── 啟動 ───────────────────────────────

init();
