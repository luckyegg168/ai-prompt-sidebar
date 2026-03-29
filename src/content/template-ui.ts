import { Template, Category, fillTemplate } from "../models/template";
import { PlatformAdapter } from "../adapters/base";

/**
 * Renders the template list view and the detail/variable-fill view.
 * All DOM is built manually (no framework).
 */

type ViewState =
  | { view: "list" }
  | { view: "detail"; template: Template }
  | { view: "create" }
  | { view: "edit"; template: Template };

export class TemplateUI {
  private container: HTMLElement;
  private templates: Template[] = [];
  private categories: Category[] = [];
  private adapter: PlatformAdapter | null;
  private selectedCategory = "all";
  private searchQuery = "";
  private state: ViewState = { view: "list" };

  // Callbacks
  onAddTemplate?: (name: string, category: string, content: string) => void;
  onUpdateTemplate?: (id: string, name: string, category: string, content: string) => void;
  onDeleteTemplate?: (id: string) => void;
  onExportTemplates?: () => void;
  onImportTemplates?: () => void;

  constructor(
    container: HTMLElement,
    adapter: PlatformAdapter | null
  ) {
    this.container = container;
    this.adapter = adapter;
  }

  setData(templates: Template[], categories: Category[]): void {
    this.templates = templates;
    this.categories = categories;
    this.render();
  }

  goToList(): void {
    this.state = { view: "list" };
    this.render();
  }

  private render(): void {
    this.container.innerHTML = "";
    switch (this.state.view) {
      case "list":
        this.renderList();
        break;
      case "detail":
        this.renderDetail(this.state.template);
        break;
      case "create":
        this.renderCreateForm();
        break;
      case "edit":
        this.renderEditForm(this.state.template);
        break;
    }
  }

  /* ─── List View ─────────────────────── */
  private renderList(): void {
    // Search bar
    const searchWrap = el("div", "aps-search");
    const searchInput = el("input") as HTMLInputElement;
    searchInput.placeholder = "🔍 搜尋模板…";
    searchInput.value = this.searchQuery;
    searchInput.addEventListener("input", () => {
      this.searchQuery = searchInput.value;
      this.render();
    });
    searchWrap.appendChild(searchInput);
    // Export/Import buttons
    const eiWrap = el("div", "aps-search-actions");
    const exportBtn = el("button", "aps-icon-btn") as HTMLButtonElement;
    exportBtn.textContent = "📤";
    exportBtn.title = "匯出模板";
    exportBtn.addEventListener("click", () => this.onExportTemplates?.());
    const importBtn = el("button", "aps-icon-btn") as HTMLButtonElement;
    importBtn.textContent = "📥";
    importBtn.title = "匯入模板";
    importBtn.addEventListener("click", () => this.onImportTemplates?.());
    eiWrap.appendChild(exportBtn);
    eiWrap.appendChild(importBtn);
    searchWrap.appendChild(eiWrap);
    this.container.appendChild(searchWrap);

    // Category tabs
    const tabs = el("div", "aps-tabs");
    const allTab = this.makeTab("全部", "all");
    tabs.appendChild(allTab);
    for (const cat of this.categories) {
      tabs.appendChild(this.makeTab(`${cat.icon} ${cat.name}`, cat.id));
    }
    this.container.appendChild(tabs);

    // Filtered templates
    const filtered = this.getFilteredTemplates();

    const list = el("div", "aps-list");
    if (filtered.length === 0) {
      const empty = el("div", "aps-empty");
      empty.innerHTML = `<div class="aps-empty-icon">📋</div><div>沒有符合的模板</div>`;
      list.appendChild(empty);
    } else {
      for (const tpl of filtered) {
        list.appendChild(this.makeCard(tpl));
      }
    }
    this.container.appendChild(list);
  }

  private makeTab(label: string, categoryId: string): HTMLButtonElement {
    const btn = el("button", "aps-tab") as HTMLButtonElement;
    btn.textContent = label;
    if (this.selectedCategory === categoryId) btn.classList.add("active");
    btn.addEventListener("click", () => {
      this.selectedCategory = categoryId;
      this.render();
    });
    return btn;
  }

  private makeCard(tpl: Template): HTMLElement {
    const card = el("div", "aps-template-card");

    const name = el("div", "aps-card-name");
    name.textContent = tpl.name;
    card.appendChild(name);

    const preview = el("div", "aps-card-preview");
    preview.textContent = tpl.content.slice(0, 120) + (tpl.content.length > 120 ? "…" : "");
    card.appendChild(preview);

    if (tpl.variables.length > 0) {
      const tags = el("div", "aps-card-tags");
      for (const v of tpl.variables) {
        const tag = el("span", "aps-var-tag");
        tag.textContent = `{{${v.name}}}`;
        tags.appendChild(tag);
      }
      card.appendChild(tags);
    }

    card.addEventListener("click", () => {
      if (tpl.variables.length > 0) {
        this.state = { view: "detail", template: tpl };
        this.render();
      } else {
        this.injectAndSubmit(tpl.content);
      }
    });

    return card;
  }

  private getFilteredTemplates(): Template[] {
    let list = this.templates;
    if (this.selectedCategory !== "all") {
      list = list.filter((t) => {
        const cat = this.categories.find((c) => c.id === this.selectedCategory);
        return cat ? t.category === cat.name : true;
      });
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q)
      );
    }
    return list;
  }

  /* ─── Detail View ───────────────────── */
  private renderDetail(tpl: Template): void {
    const detail = el("div", "aps-detail");

    // Back
    const backBtn = el("button", "aps-back-btn");
    backBtn.innerHTML = "← 返回列表";
    backBtn.addEventListener("click", () => this.goToList());
    detail.appendChild(backBtn);

    // Title
    const title = el("div", "aps-detail-title");
    title.textContent = tpl.name;
    detail.appendChild(title);

    // Content preview
    const content = el("div", "aps-detail-content");
    content.textContent = tpl.content;
    detail.appendChild(content);

    // Variable inputs
    const inputs: Record<string, HTMLInputElement> = {};
    for (const v of tpl.variables) {
      const group = el("div", "aps-form-group");
      const label = el("label");
      label.textContent = v.name;
      group.appendChild(label);

      const input = el("input") as HTMLInputElement;
      input.placeholder = v.placeholder || `請輸入 ${v.name}`;
      input.value = v.defaultValue ?? "";
      group.appendChild(input);
      detail.appendChild(group);
      inputs[v.name] = input;
    }

    this.container.appendChild(detail);

    // Actions
    const actions = el("div", "aps-actions");

    const fillBtn = el("button", "aps-btn aps-btn-secondary") as HTMLButtonElement;
    fillBtn.textContent = "📋 僅填入";
    fillBtn.addEventListener("click", () => {
      const values = this.collectValues(inputs);
      this.injectText(fillTemplate(tpl.content, values));
    });

    const copyBtn = el("button", "aps-btn aps-btn-secondary") as HTMLButtonElement;
    copyBtn.textContent = "📄 複製";
    copyBtn.addEventListener("click", () => {
      const values = this.collectValues(inputs);
      const text = fillTemplate(tpl.content, values);
      navigator.clipboard.writeText(text).then(() => {
        showToast("✅ 已複製到剪貼簿");
      });
    });

    const sendBtn = el("button", "aps-btn aps-btn-primary") as HTMLButtonElement;
    sendBtn.textContent = "🚀 填入並送出";
    sendBtn.addEventListener("click", () => {
      const values = this.collectValues(inputs);
      this.injectAndSubmit(fillTemplate(tpl.content, values));
    });

    const editBtn = el("button", "aps-btn aps-btn-secondary") as HTMLButtonElement;
    editBtn.textContent = "✏️";
    editBtn.style.flex = "0";
    editBtn.style.padding = "10px 14px";
    editBtn.addEventListener("click", () => {
      this.state = { view: "edit", template: tpl };
      this.render();
    });

    const delBtn = el("button", "aps-btn aps-btn-danger") as HTMLButtonElement;
    delBtn.textContent = "🗑️";
    delBtn.style.flex = "0";
    delBtn.style.padding = "10px 14px";
    delBtn.addEventListener("click", () => {
      if (confirm(`確定刪除「${tpl.name}」？`)) {
        this.onDeleteTemplate?.(tpl.id);
      }
    });

    actions.appendChild(fillBtn);
    actions.appendChild(copyBtn);
    actions.appendChild(sendBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    this.container.appendChild(actions);
  }

  /* ─── Create Form ───────────────────── */
  renderCreateView(): void {
    this.state = { view: "create" };
    this.render();
  }

  private renderCreateForm(): void {
    const form = el("div", "aps-create-form");

    const backBtn = el("button", "aps-back-btn");
    backBtn.innerHTML = "← 返回列表";
    backBtn.addEventListener("click", () => this.goToList());
    form.appendChild(backBtn);

    const title = el("div", "aps-detail-title");
    title.textContent = "新增自訂模板";
    form.appendChild(title);

    // Name
    const nameGroup = el("div", "aps-form-group");
    const nameLabel = el("label");
    nameLabel.textContent = "模板名稱";
    nameGroup.appendChild(nameLabel);
    const nameInput = el("input") as HTMLInputElement;
    nameInput.placeholder = "例如：個股基本面分析";
    nameGroup.appendChild(nameInput);
    form.appendChild(nameGroup);

    // Category
    const catGroup = el("div", "aps-form-group");
    const catLabel = el("label");
    catLabel.textContent = "分類";
    catGroup.appendChild(catLabel);
    const catInput = el("input") as HTMLInputElement;
    catInput.placeholder = "例如：選股分析";
    catGroup.appendChild(catInput);
    form.appendChild(catGroup);

    // Content
    const contentGroup = el("div", "aps-form-group");
    const contentLabel = el("label");
    contentLabel.textContent = "模板內容（使用 {{變數名}} 標記變數）";
    contentGroup.appendChild(contentLabel);
    const contentInput = document.createElement("textarea");
    contentInput.className = "";
    contentInput.placeholder = "請分析 {{股票代號}} 的基本面…";
    contentGroup.appendChild(contentInput);
    form.appendChild(contentGroup);

    this.container.appendChild(form);

    // Actions
    const actions = el("div", "aps-actions");
    const saveBtn = el("button", "aps-btn aps-btn-primary") as HTMLButtonElement;
    saveBtn.textContent = "💾 儲存模板";
    saveBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const cat = catInput.value.trim();
      const content = contentInput.value.trim();
      if (!name || !content) {
        showToast("請填寫模板名稱和內容", true);
        return;
      }
      this.onAddTemplate?.(name, cat || "自訂", content);
    });

    const cancelBtn = el("button", "aps-btn aps-btn-secondary") as HTMLButtonElement;
    cancelBtn.textContent = "取消";
    cancelBtn.addEventListener("click", () => this.goToList());

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    this.container.appendChild(actions);
  }

  /* ─── Edit Form ───────────────────── */
  private renderEditForm(tpl: Template): void {
    const form = el("div", "aps-create-form");

    const backBtn = el("button", "aps-back-btn");
    backBtn.innerHTML = "← 返回";
    backBtn.addEventListener("click", () => {
      this.state = { view: "detail", template: tpl };
      this.render();
    });
    form.appendChild(backBtn);

    const title = el("div", "aps-detail-title");
    title.textContent = "編輯模板";
    form.appendChild(title);

    // Name
    const nameGroup = el("div", "aps-form-group");
    const nameLabel = el("label");
    nameLabel.textContent = "模板名稱";
    nameGroup.appendChild(nameLabel);
    const nameInput = el("input") as HTMLInputElement;
    nameInput.value = tpl.name;
    nameGroup.appendChild(nameInput);
    form.appendChild(nameGroup);

    // Category
    const catGroup = el("div", "aps-form-group");
    const catLabel = el("label");
    catLabel.textContent = "分類";
    catGroup.appendChild(catLabel);
    const catInput = el("input") as HTMLInputElement;
    catInput.value = tpl.category;
    catGroup.appendChild(catInput);
    form.appendChild(catGroup);

    // Content
    const contentGroup = el("div", "aps-form-group");
    const contentLabel = el("label");
    contentLabel.textContent = "模板內容（使用 {{變數名}} 標記變數）";
    contentGroup.appendChild(contentLabel);
    const contentInput = document.createElement("textarea");
    contentInput.value = tpl.content;
    contentGroup.appendChild(contentInput);
    form.appendChild(contentGroup);

    this.container.appendChild(form);

    // Actions
    const actions = el("div", "aps-actions");
    const saveBtn = el("button", "aps-btn aps-btn-primary") as HTMLButtonElement;
    saveBtn.textContent = "💾 儲存變更";
    saveBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const cat = catInput.value.trim();
      const content = contentInput.value.trim();
      if (!name || !content) {
        showToast("請填寫模板名稱和內容", true);
        return;
      }
      this.onUpdateTemplate?.(tpl.id, name, cat || "自訂", content);
    });

    const cancelBtn = el("button", "aps-btn aps-btn-secondary") as HTMLButtonElement;
    cancelBtn.textContent = "取消";
    cancelBtn.addEventListener("click", () => {
      this.state = { view: "detail", template: tpl };
      this.render();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    this.container.appendChild(actions);
  }

  /* ─── Helpers ────────────────────────── */
  private collectValues(inputs: Record<string, HTMLInputElement>): Record<string, string> {
    const values: Record<string, string> = {};
    for (const [key, input] of Object.entries(inputs)) {
      values[key] = input.value;
    }
    return values;
  }

  private injectText(text: string): void {
    if (!this.adapter) {
      showToast("找不到適配器，無法填入。", true);
      return;
    }
    const inputEl = this.adapter.getInputElement();
    if (!inputEl) {
      showToast("找不到輸入框，請確認頁面已載入。", true);
      return;
    }
    this.adapter.setText(inputEl, text);
    showToast("✅ 已填入");
  }

  private injectAndSubmit(text: string): void {
    if (!this.adapter) {
      showToast("找不到適配器，無法送出。", true);
      return;
    }
    const inputEl = this.adapter.getInputElement();
    if (!inputEl) {
      showToast("找不到輸入框，請確認頁面已載入。", true);
      return;
    }
    this.adapter.setText(inputEl, text);
    // Small delay to let framework state update before submit
    setTimeout(() => {
      this.adapter!.submit(inputEl);
      showToast("🚀 已送出");
    }, 150);
  }
}

/* ─── DOM Utility ──────────────────────────── */
function el(tag: string, className?: string): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

export function showToast(message: string, isError = false): void {
  const existing = document.getElementById("aps-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "aps-toast";
  toast.className = "aps-toast";
  if (isError) toast.style.background = "var(--aps-danger)";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}
