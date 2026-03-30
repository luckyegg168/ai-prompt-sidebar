# 提示詞管理頁面實作計畫

## 📋 功能概述

建立獨立的提示詞管理頁面 (`management.html`)，提供完整的模板編輯、管理功能。

### 核心功能
- ✅ 模板列表與搜尋
- ✅ 即時編輯模板名稱、分類、內容、標籤
- ✅ 新增/刪除模板
- ✅ 分類管理（新增、編輯、刪除分類）
- ✅ 批量匯入/匯出 JSON
- ✅ 模板預覽功能
- ✅ 快捷鍵支援（Ctrl+S 儲存、Ctrl+N 新增）

---

## 🏗️ 實作步驟

### 1. 新增管理頁面檔案

建立以下檔案：

```
src/management/
├── management.html    # 管理頁面 UI
├── management.css     # 樣式
└── management.ts      # 邏輯
```

#### management.html 結構
```html
<!doctype html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <title>提示詞管理 - AI Prompt Sidebar</title>
    <link rel="stylesheet" href="management.css" />
  </head>
  <body>
    <div class="mgmt-container">
      <!-- 左側：模板列表 -->
      <aside class="mgmt-sidebar">
        <div class="mgmt-search">
          <input type="text" placeholder="搜尋模板..." />
          <button id="new-template-btn">＋ 新增</button>
        </div>
        <div class="mgmt-filters">
          <!-- 分類篩選 -->
        </div>
        <div class="mgmt-template-list">
          <!-- 模板卡片列表 -->
        </div>
      </aside>

      <!-- 右側：編輯器 -->
      <main class="mgmt-editor">
        <div class="mgmt-editor-header">
          <input type="text" id="template-name" placeholder="模板名稱" />
          <div class="mgmt-actions">
            <button id="preview-btn">👁️ 預覽</button>
            <button id="save-btn" class="primary">💾 儲存</button>
            <button id="delete-btn" class="danger">🗑️ 刪除</button>
          </div>
        </div>

        <div class="mgmt-form">
          <div class="form-group">
            <label>分類</label>
            <select id="template-category"></select>
            <button id="add-category-btn">＋ 新增分類</button>
          </div>

          <div class="form-group">
            <label>標籤（逗號分隔）</label>
            <input type="text" id="template-tags" placeholder="text-to-image, cinematic" />
          </div>

          <div class="form-group">
            <label>提示詞內容</label>
            <textarea id="template-content" placeholder="使用 {{變數}} 標記變數..."></textarea>
            <div class="variable-hints">
              <!-- 自動偵測的變數列表 -->
            </div>
          </div>

          <div class="form-group">
            <label>預覽</label>
            <div id="template-preview" class="preview-panel"></div>
          </div>
        </div>
      </main>
    </div>
    <script src="management.js"></script>
  </body>
</html>
```

#### management.css 設計要點
- 左右分欄佈局（sidebar 300px + editor flex）
- 深色/淺色主題支援（使用現有 CSS 變數）
- 響應式設計（小螢幕時 sidebar 可收合）
- 編輯器語法高亮（`{{變數}}` 使用特殊顏色）

#### management.ts 主要邏輯
```typescript
// 主要功能模組
- TemplateList: 渲染模板列表、搜尋、篩選
- TemplateEditor: 表單處理、即時預覽、變數偵測
- CategoryManager: 分類 CRUD
- ImportExport: JSON 匯入/匯出
- KeyboardShortcuts: 快捷鍵綁定
```

---

### 2. 更新 manifest.json

```json
{
  // 新增管理頁面為 extension page
  "chrome_url_overrides": {
    // 可選：覆蓋書籤頁面作為管理頁面入口
  },
  
  // 新增開啟管理頁面的快捷鍵
  "commands": {
    "toggle-sidebar": { ... },
    "open-management": {
      "suggested_key": {
        "default": "Ctrl+Shift+M",
        "mac": "Command+Shift+M"
      },
      "description": "開啟提示詞管理頁面"
    }
  }
}
```

---

### 3. 更新 popup.html

在 popup 底部新增按鈕：

```html
<div class="popup-footer">
  <button id="open-management-btn" class="popup-btn popup-btn-secondary">
    📋 開啟管理頁面
  </button>
</div>
```

---

### 4. 更新 storage/templates.ts

新增分類管理函式：

```typescript
// 新增分類
export async function addCategory(category: Omit<Category, "id">): Promise<Category> {
  // ...
}

// 更新分類
export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
  // ...
}

// 刪除分類
export async function deleteCategory(id: string): Promise<void> {
  // ...
}

// 強化模板驗證
export function validateTemplate(template: Partial<Template>): ValidationResult {
  // 檢查必填欄位
  // 檢查變數語法
  // 檢查分類是否存在
}
```

---

## 📁 完整檔案結構

```
src/
├── management/         # 新增
│   ├── management.html
│   ├── management.css
│   └── management.ts
├── popup/
│   ├── popup.html     # 更新：新增開啟管理頁面按鈕
│   ├── popup.css
│   └── popup.ts       # 更新：處理開啟管理頁面
├── storage/
│   └── templates.ts   # 更新：新增分類管理函式
├── adapters/
├── background/
├── content/
└── models/
```

---

## 🎨 UI 設計規範

### 配色（使用現有主題變數）
```css
:root {
  --mgmt-bg: var(--aps-bg);
  --mgmt-sidebar-bg: var(--aps-bg-secondary);
  --mgmt-border: var(--aps-border);
  --mgmt-accent: var(--aps-accent);
  --mgmt-danger: var(--aps-danger);
}
```

### 佈局
```
┌─────────────────────────────────────┐
│ Header (可選)                        │
├─────────────┬───────────────────────┤
│             │                       │
│  Sidebar    │    Editor             │
│  (300px)    │    (flex)             │
│             │                       │
│  - 搜尋     │  - 名稱輸入           │
│  - 篩選     │  - 分類選擇           │
│  - 列表     │  - 內容編輯器         │
│             │  - 標籤輸入           │
│             │  - 預覽區             │
│             │  - 動作按鈕           │
└─────────────┴───────────────────────┘
```

---

## ⚠️ 注意事項

### 資料同步
- 管理頁面與側邊欄共用 `chrome.storage.local`
- 需監聽 `chrome.storage.onChanged` 實現即時同步
- 編輯中時避免被外部更新覆蓋（加入 dirty flag）

### 未儲存提示
```typescript
window.addEventListener('beforeunload', (e) => {
  if (isDirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});
```

### 變數語法高亮
使用簡單的正則表達式標記 `{{變數}}`：
```typescript
function highlightVariables(content: string): string {
  return content.replace(/\{\{([^}]+)\}\}/g, '<span class="var">$1</span>');
}
```

### 性能優化
- 模板列表使用虛擬滾動（超過 50 個模板時）
- 預覽使用 debounce（延遲 300ms）
- 儲存時加入防呆（避免短時間重複儲存）

---

## 🧪 測試計畫

### 單元測試
- [ ] `extractVariables()` 正確偵測變數
- [ ] `validateTemplate()` 驗證邏輯
- [ ] 分類 CRUD 操作

### 整合測試
- [ ] 新增模板 → 儲存 → 列表更新
- [ ] 編輯模板 → 預覽 → 儲存
- [ ] 匯入 JSON → 列表顯示
- [ ] 匯出 JSON → 檔案格式正確

### E2E 測試
- [ ] 開啟管理頁面
- [ ] 搜尋模板
- [ ] 完整編輯流程
- [ ] 快捷鍵操作

---

## 📅 實作時程預估

| 階段 | 任務 | 預估時間 |
|------|------|----------|
| 1 | 建立管理頁面基礎架構 | 2 小時 |
| 2 | 實作模板列表與搜尋 | 2 小時 |
| 3 | 實作編輯器與即時預覽 | 3 小時 |
| 4 | 分類管理功能 | 2 小時 |
| 5 | 匯入/匯出功能 | 1 小時 |
| 6 | 快捷鍵與無障礙優化 | 1 小時 |
| 7 | 測試與除錯 | 2 小時 |
| **總計** | | **13 小時** |

---

## 🚀 未來擴充

### 進階功能
- [ ] 模板版本歷史（記錄每次修改）
- [ ] 模板分享（生成分享連結）
- [ ] 協作編輯（多人同時編輯）
- [ ] AI 輔助撰寫（根據描述生成提示詞）
- [ ] 模板分析（使用次數、成功率統計）

### 整合功能
- [ ] 與側邊欄雙向同步
- [ ] 快捷鍵自訂
- [ ] 主題編輯器
- [ ] 快捷指令面板

---

## 📝 相關文件

- [CONTRIBUTING.md](../CONTRIBUTING.md) - 貢獻者指南
- [CHANGELOG.md](../CHANGELOG.md) - 版本變更記錄
