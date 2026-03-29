# AI Prompt Sidebar — Chrome Extension

在 AI 聊天平台（Grok、Gemini、ChatGPT、Claude）頁面注入浮動側邊欄，提供預設金融分析提示詞模板，支援一鍵填入並送出。

## 功能特色

- **跨平台支援** — Grok、Gemini、ChatGPT、Claude
- **9 組預設模板** — 選股分析、財報解讀、產業研究
- **{{變數}} 語法** — 模板中使用 `{{股票代號}}` 等變數，填入時動態替換
- **一鍵送出** — 點擊即填入 AI 輸入框並自動送出
- **複製到剪貼簿** — 快速複製已填入變數的提示詞
- **自訂模板** — 新增、編輯、刪除自己的模板
- **匯入/匯出** — JSON 格式匯出匯入，方便備份分享
- **深色/淺色主題** — 自動偵測平台主題或手動設定
- **本機儲存** — 使用 chrome.storage.local，隱私離線可用

## 安裝方式

```bash
# 1. Clone 專案
git clone https://github.com/luckyegg168/ai-prompt-sidebar.git
cd ai-prompt-sidebar

# 2. 安裝依賴
npm install

# 3. 建置
npm run build

# 4. 載入到 Chrome
# 開啟 chrome://extensions
# 啟用「開發人員模式」
# 點擊「載入未封裝項目」→ 選擇 dist/ 資料夾
```

## 開發

```bash
# 監聽模式（自動重建）
npm run dev
```

## 預設模板

### 選股分析
- 個股基本面分析
- 技術面快速掃描
- 同業比較

### 財報解讀
- 季報快速摘要
- 現金流量分析
- 財報紅旗偵測

### 產業研究
- 產業鏈分析
- 產業趨勢報告
- ETF 成分股分析

## 技術架構

| 組件 | 技術 |
|------|------|
| 擴充格式 | Manifest V3 |
| 語言 | TypeScript |
| 建置工具 | esbuild |
| UI | Vanilla DOM （無框架） |
| 樣式 | CSS Custom Properties |
| 儲存 | chrome.storage.local |
| 設計模式 | Adapter Pattern |

## 專案結構

```
src/
├── adapters/      # 平台適配器（Grok, Gemini, ChatGPT, Claude）
├── background/    # Service Worker
├── content/       # 側邊欄 UI + 樣式
├── models/        # 型別定義
├── popup/         # 設定彈出視窗
└── storage/       # chrome.storage CRUD
```

## License

MIT
