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
  private selectedTag = "";
  private showFavoritesOnly = false;
  private collapsedGroups: Set<string> = new Set();
  private state: ViewState = { view: "list" };

  // Callbacks
  onAddTemplate?: (name: string, category: string, content: string) => void;
  onUpdateTemplate?: (id: string, name: string, category: string, content: string) => void;
  onDeleteTemplate?: (id: string) => void;
  onExportTemplates?: () => void;
  onImportTemplates?: () => void;
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;

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
    let searchTimer: ReturnType<typeof setTimeout> | null = null;
    searchInput.addEventListener("input", () => {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        this.searchQuery = searchInput.value;
        this.render();
      }, 150);
    });
    searchWrap.appendChild(searchInput);
    // Export/Import buttons
    const eiWrap = el("div", "aps-search-actions");

    const favToggle = el("button", "aps-icon-btn" + (this.showFavoritesOnly ? " aps-fav-active" : "")) as HTMLButtonElement;
    favToggle.textContent = "⭐";
    favToggle.title = this.showFavoritesOnly ? "顯示全部" : "只顯示收藏";
    favToggle.addEventListener("click", () => {
      this.showFavoritesOnly = !this.showFavoritesOnly;
      this.render();
    });

    const exportBtn = el("button", "aps-icon-btn") as HTMLButtonElement;
    exportBtn.textContent = "📤";
    exportBtn.title = "匯出模板";
    exportBtn.addEventListener("click", () => this.onExportTemplates?.());
    const importBtn = el("button", "aps-icon-btn") as HTMLButtonElement;
    importBtn.textContent = "📥";
    importBtn.title = "匯入模板";
    importBtn.addEventListener("click", () => this.onImportTemplates?.());
    eiWrap.appendChild(favToggle);
    eiWrap.appendChild(exportBtn);
    eiWrap.appendChild(importBtn);
    searchWrap.appendChild(eiWrap);
    this.container.appendChild(searchWrap);

    // Category tabs with count badges
    const tabs = el("div", "aps-tabs");
    const allCount = this.getCountForCategory("all");
    const allTab = this.makeTab(`全部`, "all", allCount);
    tabs.appendChild(allTab);
    for (const cat of this.categories) {
      const count = this.getCountForCategory(cat.id);
      tabs.appendChild(this.makeTab(`${cat.icon} ${cat.name}`, cat.id, count));
    }
    this.container.appendChild(tabs);

    // Tag filter chips
    const availableTags = this.getAvailableTags();
    if (availableTags.length > 0) {
      const tagWrap = el("div", "aps-tag-filters");
      if (this.selectedTag) {
        const clearChip = el("button", "aps-tag-chip aps-tag-clear");
        clearChip.textContent = "✕ 清除標籤";
        clearChip.addEventListener("click", () => {
          this.selectedTag = "";
          this.render();
        });
        tagWrap.appendChild(clearChip);
      }
      for (const tag of availableTags) {
        const chip = el("button", "aps-tag-chip" + (this.selectedTag === tag ? " active" : ""));
        chip.textContent = tag;
        chip.addEventListener("click", () => {
          this.selectedTag = this.selectedTag === tag ? "" : tag;
          this.render();
        });
        tagWrap.appendChild(chip);
      }
      this.container.appendChild(tagWrap);
    }

    // Filtered templates
    const filtered = this.getFilteredTemplates();

    const list = el("div", "aps-list");
    if (filtered.length === 0) {
      const empty = el("div", "aps-empty");
      empty.innerHTML = `<div class="aps-empty-icon">📋</div><div>沒有符合的模板</div>`;
      list.appendChild(empty);
    } else if (this.selectedCategory !== "all" && !this.selectedTag && !this.searchQuery.trim()) {
      // Group by subcategory (tag) when viewing a specific category
      const groups = this.groupByTag(filtered);
      for (const group of groups) {
        const isCollapsed = this.collapsedGroups.has(group.tag);
        const section = el("div", "aps-subcategory-section");

        const header = el("div", "aps-subcategory-header");
        const arrow = el("span", "aps-subcategory-arrow" + (isCollapsed ? " collapsed" : ""));
        arrow.textContent = "▾";
        header.appendChild(arrow);
        const headerLabel = el("span", "aps-subcategory-label");
        headerLabel.textContent = group.tag;
        header.appendChild(headerLabel);
        const countBadge = el("span", "aps-subcategory-count");
        countBadge.textContent = String(group.templates.length);
        header.appendChild(countBadge);
        header.addEventListener("click", () => {
          if (this.collapsedGroups.has(group.tag)) {
            this.collapsedGroups.delete(group.tag);
          } else {
            this.collapsedGroups.add(group.tag);
          }
          this.render();
        });
        section.appendChild(header);

        if (!isCollapsed) {
          const groupList = el("div", "aps-subcategory-list");
          for (const tpl of group.templates) {
            groupList.appendChild(this.makeCard(tpl));
          }
          section.appendChild(groupList);
        }

        list.appendChild(section);
      }
    } else {
      for (const tpl of filtered) {
        list.appendChild(this.makeCard(tpl));
      }
    }
    this.container.appendChild(list);
  }

  /** Group templates by their first tag (subcategory) */
  private groupByTag(templates: Template[]): { tag: string; templates: Template[] }[] {
    const map = new Map<string, Template[]>();
    for (const tpl of templates) {
      const tag = tpl.tags?.[0] ?? "其他";
      const arr = map.get(tag);
      if (arr) {
        arr.push(tpl);
      } else {
        map.set(tag, [tpl]);
      }
    }
    return [...map.entries()].map(([tag, tpls]) => ({ tag, templates: tpls }));
  }

  /** Count templates for a given category (respecting favorites filter) */
  private getCountForCategory(categoryId: string): number {
    let list = this.templates;
    if (this.showFavoritesOnly) {
      list = list.filter((t) => t.isFavorite);
    }
    if (categoryId !== "all") {
      const cat = this.categories.find((c) => c.id === categoryId);
      if (cat) list = list.filter((t) => t.category === cat.name);
    }
    return list.length;
  }

  private makeTab(label: string, categoryId: string, count?: number): HTMLButtonElement {
    const btn = el("button", "aps-tab") as HTMLButtonElement;
    if (count !== undefined) {
      const labelSpan = el("span");
      labelSpan.textContent = label;
      btn.appendChild(labelSpan);
      const badge = el("span", "aps-tab-count");
      badge.textContent = String(count);
      btn.appendChild(badge);
    } else {
      btn.textContent = label;
    }
    if (this.selectedCategory === categoryId) btn.classList.add("active");
    btn.addEventListener("click", () => {
      this.selectedCategory = categoryId;
      this.selectedTag = "";
      this.render();
    });
    return btn;
  }

  private makeCard(tpl: Template): HTMLElement {
    const card = el("div", "aps-template-card");

    // Header row: name + favorite star
    const headerRow = el("div", "aps-card-header");
    const name = el("div", "aps-card-name");
    name.textContent = tpl.name;
    headerRow.appendChild(name);

    const starBtn = el("button", "aps-star-btn" + (tpl.isFavorite ? " aps-starred" : ""));
    starBtn.textContent = tpl.isFavorite ? "★" : "☆";
    starBtn.title = tpl.isFavorite ? "取消收藏" : "加入收藏";
    starBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.onToggleFavorite?.(tpl.id, !tpl.isFavorite);
    });
    headerRow.appendChild(starBtn);
    card.appendChild(headerRow);

    const preview = el("div", "aps-card-preview");
    preview.textContent = tpl.content.slice(0, 120) + (tpl.content.length > 120 ? "…" : "");
    card.appendChild(preview);

    // Tag pills (template tags, not variable tags)
    if (tpl.tags && tpl.tags.length > 0) {
      const tagRow = el("div", "aps-card-tag-pills");
      for (const tag of tpl.tags.slice(0, 3)) {
        const pill = el("span", "aps-tag-pill");
        pill.textContent = tag;
        tagRow.appendChild(pill);
      }
      if (tpl.tags.length > 3) {
        const more = el("span", "aps-tag-pill aps-tag-more");
        more.textContent = `+${tpl.tags.length - 3}`;
        tagRow.appendChild(more);
      }
      card.appendChild(tagRow);
    }

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
    if (this.showFavoritesOnly) {
      list = list.filter((t) => t.isFavorite);
    }
    if (this.selectedCategory !== "all") {
      list = list.filter((t) => {
        const cat = this.categories.find((c) => c.id === this.selectedCategory);
        return cat ? t.category === cat.name : true;
      });
    }
    if (this.selectedTag) {
      list = list.filter((t) => t.tags?.includes(this.selectedTag));
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q) ||
          (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    }
    // Favorites first
    return [...list].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
  }

  /** Collect unique tags from templates visible under current category filter */
  private getAvailableTags(): string[] {
    let list = this.templates;
    if (this.selectedCategory !== "all") {
      list = list.filter((t) => {
        const cat = this.categories.find((c) => c.id === this.selectedCategory);
        return cat ? t.category === cat.name : true;
      });
    }
    const tagSet = new Set<string>();
    for (const t of list) {
      for (const tag of t.tags ?? []) {
        tagSet.add(tag);
      }
    }
    return [...tagSet].sort();
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

    // Category (dropdown + custom option)
    const catGroup = el("div", "aps-form-group");
    const catLabel = el("label");
    catLabel.textContent = "��類";
    catGroup.appendChild(catLabel);
    const catSelect = document.createElement("select") as HTMLSelectElement;
    catSelect.className = "aps-form-select";
    for (const c of this.categories) {
      const opt = document.createElement("option");
      opt.value = c.name;
      opt.textContent = `${c.icon} ${c.name}`;
      catSelect.appendChild(opt);
    }
    const customOpt = document.createElement("option");
    customOpt.value = "__custom__";
    customOpt.textContent = "＋ 自訂分類…";
    catSelect.appendChild(customOpt);
    catGroup.appendChild(catSelect);
    const catCustomInput = el("input") as HTMLInputElement;
    catCustomInput.placeholder = "輸入自訂分類名稱";
    catCustomInput.style.display = "none";
    catCustomInput.style.marginTop = "6px";
    catGroup.appendChild(catCustomInput);
    catSelect.addEventListener("change", () => {
      catCustomInput.style.display = catSelect.value === "__custom__" ? "" : "none";
    });
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
    saveBtn.textContent = "💾 儲存模��";
    saveBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const cat = catSelect.value === "__custom__" ? catCustomInput.value.trim() : catSelect.value;
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

    // Category (dropdown + custom option)
    const catGroup = el("div", "aps-form-group");
    const catLabel = el("label");
    catLabel.textContent = "分類";
    catGroup.appendChild(catLabel);
    const catSelect = document.createElement("select") as HTMLSelectElement;
    catSelect.className = "aps-form-select";
    let foundCategory = false;
    for (const c of this.categories) {
      const opt = document.createElement("option");
      opt.value = c.name;
      opt.textContent = `${c.icon} ${c.name}`;
      if (c.name === tpl.category) {
        opt.selected = true;
        foundCategory = true;
      }
      catSelect.appendChild(opt);
    }
    const customOpt = document.createElement("option");
    customOpt.value = "__custom__";
    customOpt.textContent = "＋ 自訂分類…";
    if (!foundCategory) customOpt.selected = true;
    catSelect.appendChild(customOpt);
    catGroup.appendChild(catSelect);
    const catCustomInput = el("input") as HTMLInputElement;
    catCustomInput.placeholder = "輸入自訂分類名稱";
    catCustomInput.value = foundCategory ? "" : tpl.category;
    catCustomInput.style.display = foundCategory ? "none" : "";
    catCustomInput.style.marginTop = "6px";
    catGroup.appendChild(catCustomInput);
    catSelect.addEventListener("change", () => {
      catCustomInput.style.display = catSelect.value === "__custom__" ? "" : "none";
    });
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
      const cat = catSelect.value === "__custom__" ? catCustomInput.value.trim() : catSelect.value;
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
