# AI Prompt Sidebar — Chrome Extension

## Project Overview

Chrome 擴充工具：在 AI 聊天平台（Grok、Gemini）頁面注入浮動側邊欄，提供預設提示詞模板，支援一鍵填入並送出。主要用於金融分析場景：選股分析、財報解讀、產業研究。

## Tech Stack

- **Manifest V3** — Chrome 強制要求
- **TypeScript** — 型別安全，減少 DOM 操作錯誤
- **Vanilla DOM** — 無框架，側邊欄輕量快速
- **CSS Custom Properties** — 主題適配各平台深色/淺色模式
- **chrome.storage.local** — 本機儲存模板資料
- **Build**: esbuild (快速打包 TS → JS)

## Supported Platforms

| Platform | URL Pattern | Priority |
|----------|-------------|----------|
| Grok | `x.com/i/grok*`, `grok.com/*` | P0 |
| Gemini | `gemini.google.com/*` | P0 |
| ChatGPT | `chatgpt.com/*` | P1 (future) |
| Claude | `claude.ai/*` | P1 (future) |

## Architecture

```
mychromeext/
├── CLAUDE.md
├── manifest.json          # Manifest V3 config
├── package.json
├── tsconfig.json
├── esbuild.config.mjs     # Build script
├── src/
│   ├── content/
│   │   ├── sidebar.ts     # Sidebar UI injection & lifecycle
│   │   ├── sidebar.css    # Sidebar styles
│   │   └── template-ui.ts # Template list rendering & variable form
│   ├── adapters/
│   │   ├── base.ts        # Platform adapter interface
│   │   ├── grok.ts        # Grok DOM selectors & input injection
│   │   └── gemini.ts      # Gemini DOM selectors & input injection
│   ├── models/
│   │   └── template.ts    # Template & Category type definitions
│   ├── storage/
│   │   └── templates.ts   # chrome.storage.local CRUD operations
│   ├── background/
│   │   └── service-worker.ts  # Extension lifecycle, context menu
│   └── popup/
│       ├── popup.html      # Popup for quick settings
│       ├── popup.ts
│       └── popup.css
├── templates/
│   └── defaults.json       # Built-in default templates (bundled)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── dist/                   # Build output (gitignored)
```

## Data Model

### Template

```typescript
interface Template {
  id: string;                // crypto.randomUUID()
  name: string;              // "個股基本面分析"
  category: string;          // "選股分析" | "財報解讀" | "產業研究" | custom
  content: string;           // prompt body, supports {{variable}} syntax
  variables: Variable[];     // extracted from content
  platform?: string;         // optional: lock to specific platform
  createdAt: number;
  updatedAt: number;
}

interface Variable {
  name: string;              // "股票代號"
  placeholder?: string;      // "例如：2330"
  defaultValue?: string;     // ""
}

interface Category {
  id: string;
  name: string;              // "選股分析"
  icon: string;              // emoji or icon class
  order: number;
}
```

### Storage Schema

```typescript
// chrome.storage.local keys
{
  "templates": Template[],
  "categories": Category[],
  "settings": {
    sidebarWidth: number,       // default 320
    autoShow: boolean,          // default true
    defaultPlatform: string,
    theme: "auto" | "light" | "dark"
  }
}
```

## Platform Adapter Interface

```typescript
interface PlatformAdapter {
  name: string;
  matchUrl(url: string): boolean;
  getInputElement(): HTMLElement | null;
  setText(element: HTMLElement, text: string): void;
  submit(element: HTMLElement): void;
  getTheme(): "light" | "dark";
}
```

Each adapter handles platform-specific DOM quirks:
- Finding the correct input element (textarea / contenteditable div)
- Setting text with proper event dispatching (Input, Change events)
- Triggering submit (Enter key / button click)
- Detecting current theme for sidebar styling

## Default Templates

### Category: 選股分析
- **個股基本面分析**: `請分析 {{股票代號}} ({{股票名稱}}) 的基本面，包含：近四季 EPS、本益比、股價淨值比、殖利率、營收年增率。給出投資建議與風險提示。`
- **技術面快速掃描**: `請用技術分析觀點分析 {{股票代號}}，包含：目前均線排列（5/10/20/60 日線）、KD 與 RSI 指標、近期成交量變化、支撐與壓力價位。`
- **同業比較**: `請比較 {{股票代號列表}} 這幾檔同業股票，從營收成長率、毛利率、本益比、殖利率等維度做表格比較，並指出各自優劣勢。`

### Category: 財報解讀
- **季報快速摘要**: `請解讀 {{公司名稱}} {{年度}}Q{{季度}} 財報重點，包含：營收、毛利率、營業利益率、EPS 與去年同期比較，並指出值得注意的異常項目。`
- **現金流量分析**: `請分析 {{公司名稱}} 最近四季的現金流量表，說明營業、投資、籌資活動現金流的變化趨勢，判斷公司的資金健康度。`
- **財報紅旗偵測**: `請檢查 {{公司名稱}} 最新財報是否有以下紅旗：應收帳款異常增加、存貨週轉天數拉長、負債比率飆升、業外損益佔比過高、現金流與獲利背離。`

### Category: 產業研究
- **產業鏈分析**: `請分析 {{產業名稱}} 的上中下游產業鏈結構，列出各環節的代表性公司（台股為主），並說明目前產業景氣位階。`
- **產業趨勢報告**: `請提供 {{產業名稱}} 的 2024-2025 年趨勢分析，包含：市場規模、成長驅動力、主要風險、受惠公司（台股），以及投資建議。`
- **ETF 成分股分析**: `請分析 {{ETF代號}} 的前十大成分股，說明各成分股的產業分布、權重、近期表現，並評估該 ETF 的投資價值。`

## Build & Dev

```bash
# Install dependencies
npm install

# Development (watch mode)
npm run dev

# Production build
npm run build

# Load in Chrome:
# 1. chrome://extensions
# 2. Enable Developer Mode
# 3. Load unpacked → select dist/
```

## Key Design Decisions

1. **Content Script 注入面板 (非 Side Panel API)** — 需要直接操作各平台 DOM
2. **本機儲存 (非雲端同步)** — 簡單、隱私、離線可用
3. **Adapter Pattern** — 每個 AI 平台一個適配器，隔離 DOM 差異
4. **Variable 語法 `{{name}}`** — 簡單直覺，Mustache 風格
5. **esbuild** — 比 webpack 快 10x，Chrome extension 不需要 HMR
6. **無框架** — 側邊欄 UI 簡單，Vanilla TS 足夠，避免 bundle 膨脹

## Development Notes

- DOM selectors WILL break when platforms update — adapters should fail gracefully with user-friendly error messages
- Use `MutationObserver` to detect SPA navigation on all platforms
- Sidebar z-index must be high enough to overlay platform UI but not block modals
- Test on both light/dark mode for each platform
- Variable extraction uses regex: `/\{\{([^}]+)\}\}/g`
