/**
 * AI Prompt Sidebar — Management Page
 * 提示詞管理頁面主邏輯
 */

import {
  Template,
  Category,
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
} from "../storage/templates";

// ── 狀態管理 ───────────────────────────────

interface AppState {
  templates: Template[];
  categories: Category[];
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

  importModalOverlay: HTMLElement | null;
  importModal: HTMLElement | null;
  importModalClose: HTMLElement | null;
  importJson: HTMLTextAreaElement | null;
  importFileBtn: HTMLElement | null;
  importFileInput: HTMLInputElement | null;
  importConfirmBtn: HTMLElement | null;

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

    // 匯入 Modal
    importModalOverlay: document.getElementById("import-modal-overlay"),
    importModal: document.getElementById("import-modal"),
    importModalClose: document.getElementById("import-modal-close"),
    importJson: document.getElementById("import-json") as HTMLTextAreaElement | null,
    importFileBtn: document.getElementById("import-file-btn"),
    importFileInput: document.getElementById("import-file-input") as HTMLInputElement | null,
    importConfirmBtn: document.getElementById("import-confirm-btn"),

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
  els.exportBtn?.addEventListener("click", handleExport);

  // 匯入
  els.importBtn?.addEventListener("click", () => {
    els.importModalOverlay?.classList.add("visible");
  });

  els.importModalClose?.addEventListener("click", () => {
    els.importModalOverlay?.classList.remove("visible");
  });

  els.importFileBtn?.addEventListener("click", () => {
    els.importFileInput?.click();
  });

  els.importFileInput?.addEventListener("change", handleFileSelect);

  els.importConfirmBtn?.addEventListener("click", handleImport);

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
      els.importModalOverlay?.classList.remove("visible");
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

function handleExport() {
  const data = {
    categories: state.categories,
    templates: state.templates,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ai-prompt-templates-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showToast("📤 模板已匯出");
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
  const jsonStr = (els.importJson as HTMLTextAreaElement)?.value.trim();
  if (!jsonStr) {
    showToast("請輸入或選擇 JSON 檔案", true);
    return;
  }

  try {
    const data = JSON.parse(jsonStr);

    if (!Array.isArray(data.templates)) {
      throw new Error("無效的模板格式");
    }

    const now = Date.now();
    const imported: Template[] = data.templates.map((t: Record<string, unknown>) => ({
      id: crypto.randomUUID(),
      name: String(t.name ?? ""),
      category: String(t.category ?? "自訂"),
      content: String(t.content ?? ""),
      variables: extractVariables(String(t.content ?? "")),
      tags: Array.isArray(t.tags) ? t.tags.map(String) : [],
      isFavorite: Boolean(t.isFavorite),
      createdAt: now,
      updatedAt: now,
    }));

    await saveTemplates([...state.templates, ...imported]);

    // 如果有分類也匯入
    if (Array.isArray(data.categories)) {
      const existingNames = new Set(state.categories.map((c) => c.name));
      const newCategories = data.categories
        .filter((c: Record<string, unknown>) => {
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

      if (newCategories.length > 0) {
        await saveCategories([...state.categories, ...newCategories]);
      }
    }

    await loadData();
    render();

    els.importModalOverlay?.classList.remove("visible");
    if (els.importJson) els.importJson.value = "";

    showToast(`📥 已匯入 ${imported.length} 個模板`);
  } catch (error) {
    console.error("[Management] Failed to import:", error);
    showToast("匯入失敗，請檢查 JSON 格式", true);
  }
}

// ── 工具函式 ───────────────────────────────

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
