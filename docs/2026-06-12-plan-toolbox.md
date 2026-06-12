# Data Toolbox 工具箱擴充計畫書 v1.2（定稿）

> 版本：v1.2（2024 定稿）
> 基線：v1（資料健檢 Health Check + 資料比對 Diff）已完成驗收
> 本文件 = v1.1 全文 + v1.2 日期格式修訂（yyyy/m/d 優先）合併版

---

## 〇、修訂摘要

| # | 原計畫問題 | 修訂內容 |
|---|-----------|---------|
| 1 | 各工具各自實作解析邏輯 | 統一由 `App.Parser.parseToTable()` 輸出標準表格物件 |
| 2 | 上傳 UI 重複實作 | 統一 `App.UI.createUploader()`，支援拖放、多檔、多工作表選擇 |
| 3 | 路由為硬編碼 | 改為註冊制 `App.Router`，分組導覽，保留 `#health`、`#diff` 相容 |
| 4 | 大檔處理會凍結 UI | 全面採批次處理（每 tick 2,000–3,000 列）+ 進度條 |
| 5 | XSS 風險 | 所有動態渲染強制經 `App.UI.escapeHtml()` |
| 6 | Regex 工具有 ReDoS 風險 | 新增 `App.RegexUtil` 安全編譯 + 執行逾時保護 |
| 7 | 工具間資料無法流轉 | 標準化 `App.State.current`，支援「送往其他工具」 |
| 8 | 匯出邏輯分散 | 統一 XLSX / CSV / JSON / PNG 匯出 helper |
| 9 | 日期解析優先序未明確（v1.1 預設美式 M/D/YYYY） | **改為年份優先**：解析與輸出皆以 `YYYY/M/D` 為第一優先，詳見 §5.1 與 §八 |

---

## 一、現況基準（v1）

- **已完成工具**：
  - `#health` 資料健檢：欄位型別偵測、空值統計、重複列偵測、異常值提示
  - `#diff` 資料比對：兩檔逐列比對、鍵值對齊、差異高亮
- **技術棧**：
  - Vanilla JavaScript（ES6+）、HTML5、CSS3（深色模式）
  - SheetJS（`xlsx.full.min.js`）、Chart.js（`chart.umd.min.js`）
  - **完全離線運作**，無任何外部請求、無後端、無打包工具
- **相容性鐵則**：新模組**不得破壞**既有 Health Check 與 Diff Engine 的 API 與行為。

---

## 二、目標與範圍

將既有「健檢 + 比對」應用擴充為**離線資料處理工作台 v2**，覆蓋完整資料生命週期：

```
合併（Merge）→ 清洗（Clean）→ 分析（Analyze）→ 轉換（Transform）→ 比對（Compare）
```

### 新增 8 個功能模組

| # | 模組 | 優先級 |
|---|------|--------|
| 1 | 資料清洗器 Data Cleaner | P0 |
| 2 | 欄位工具 Column Tool | P0 |
| 3 | 批次合併 Batch Merger | P1 |
| 4 | 快速樞紐 Quick Pivot | P1 |
| 5 | 格式轉換器 Format Converter | P2 |
| 6 | Regex 測試器 Regex Tester | P2 |
| 7 | JSON 檢視器 JSON Viewer | P3 |
| 8 | 假資料產生器 Mock Data Generator | P3 |

---

## 三、實作規範（全模組共用）

### 3.1 架構規範

- 全域命名空間 `App`，各模組以 IIFE 註冊：`App.Cleaner`、`App.ColumnTool`、`App.Merger`、`App.Pivot`、`App.Converter`、`App.RegexTester`、`App.JsonViewer`、`App.MockGen`。
- 模組統一介面：

```js
App.Cleaner = (function () {
  function init(container) { /* 渲染 UI、綁定事件 */ }
  function destroy() { /* 清理事件與暫存 */ }
  return { init, destroy };
})();
```

- 跨工具資料流轉：標準化 `App.State.current`：

```js
App.State.current = {
  headers: ["欄A", "欄B"],
  rows: [["v1", "v2"], ...],   // 二維陣列，全部為字串或 null
  meta: { sourceName: "file.xlsx", sheetName: "Sheet1", totalRows: 1234 }
};
```

- 每個工具結果區提供「送往其他工具」下拉選單，寫入 `App.State.current` 後切換路由。

### 3.2 效能規範

| 項目 | 規範 |
|------|------|
| 批次處理 | 每 tick 處理 2,000–3,000 列，`setTimeout(fn, 0)` 讓出主執行緒 |
| 大檔警告 | 超過 50,000 列顯示警告並要求確認 |
| UI 渲染上限 | 表格最多渲染 500 列，其餘以「僅顯示前 500 列」提示 |
| 預覽上限 | 操作前預覽固定 20 列 |
| 進度回饋 | 任何 >1 秒的處理需顯示進度條與已處理列數 |

### 3.3 安全規範

- **XSS**：所有將使用者資料插入 DOM 的位置，強制經 `App.UI.escapeHtml()`；禁止以未轉義字串拼接 `innerHTML`。
- **ReDoS**：使用者輸入的 regex 一律經 `App.RegexUtil.safeCompile()`；執行採分段 + 逾時中斷（單列比對逾 200ms 中止並提示）。
- 不引入任何 `eval` / `new Function` 處理使用者輸入。

---

## 四、Batch 0：核心基礎建設

### 4.1 `App.Parser.parseToTable(file | sheet)`

- 輸入：File 物件（xlsx / xls / csv / tsv / json）或已選定的 SheetJS sheet。
- 輸出：`Promise<{headers, rows, meta}>`（同 §3.1 標準格式）。
- CSV 需自動偵測分隔符（`,`、`;`、`\t`、`|`）與 BOM。
- JSON：限定「物件陣列」結構，自動聯集所有 key 作為 headers。

### 4.2 `App.UI.createUploader(options)`

```js
App.UI.createUploader({
  container: el,
  multiple: false,        // 批次合併設 true
  accept: [".xlsx", ".xls", ".csv", ".json"],
  onParsed: (table) => {},
  onError: (msg) => {}
});
```

- 支援：點擊選檔、拖放、多檔；xlsx 多工作表時彈出工作表選擇。
- 內建檔案大小 / 列數警告（50,000 列門檻）。

### 4.3 `App.UI` 匯出與渲染 helper

- `exportXLSX(table, filename)`、`exportCSV(table, filename)`、`exportJSON(table, filename)`、`exportPNG(canvas, filename)`
- `renderCompareTable(before, after, options)`：操作前後對照表（高亮變更儲存格）。
- `escapeHtml(str)`：強制轉義。

### 4.4 `App.Router` 註冊制

```js
App.Router.register({
  hash: "#cleaner",
  group: "處理",          // 分析 / 處理 / 工具
  title: "資料清洗器",
  module: App.Cleaner
});
```

- 導覽列依 group 分組渲染。
- `#health`、`#diff` 維持原 hash 不變（向下相容）。
- 切換路由時呼叫前一模組 `destroy()`。

### 4.5 `App.RegexUtil`

- `safeCompile(pattern, flags)`：try/catch 回傳 `{ok, regex, error}`。
- `safeMatch(regex, text, timeoutMs)`：逾時中止。
- 危險模式靜態偵測（巢狀量詞如 `(a+)+` 提出警告）。

**Batch 0 驗收標準**
- [ ] 健檢與比對兩工具改用 `parseToTable()` 後行為完全不變
- [ ] 上傳元件在三種格式（xlsx 多表、csv、json）皆可正常解析
- [ ] 路由分組導覽正常，舊 hash 直連可用
- [ ] `escapeHtml` 單元測試：`<script>`、引號、`&` 皆正確轉義

---

## 五、功能模組規格

### 5.1 資料清洗器 Data Cleaner（P0）`#cleaner`

**操作清單（可勾選組合、依序執行）**

| 操作 | 規則 | 邊界條件 |
|------|------|---------|
| 去除前後空白 | trim 全部儲存格，含全形空白 `\u3000` | — |
| 全形轉半形 | 數字、英文、常用符號 | 不轉換 CJK 文字 |
| 大小寫轉換 | 大寫 / 小寫 / 首字大寫，限選定欄 | — |
| 移除空白列 | 整列皆空才移除 | — |
| 移除重複列 | 整列比對或指定鍵欄 | 保留第一筆 |
| 移除欄位 | 多選欄移除 | 至少保留 1 欄 |
| 空值填補 | 固定值 / 向下填補 / 數值欄平均值 | 平均值僅限可解析為數值的欄 |
| 數字統一 | 去千分位、全形數字轉半形、統一小數位數 | 無法解析者保留原樣 |
| 日期統一 | **解析優先序（由高至低，逐一嘗試，命中即停）**：<br>① `YYYY/M/D`（含 `YYYY-M-D`、`YYYY.M.D`，分隔符 `/`、`-`、`.` 等價）<br>② `YYYY年M月D日`<br>③ Excel 日期序號（數值且 25569~80000 區間、**且該欄 ≥60% 符合**時才啟用序號解讀）<br>④ `M/D/YYYY` 或 `D/M/YYYY`（年份在後的歧義格式，依 UI 設定解讀，預設 `M/D/YYYY`）<br>**歧義消解規則**：三段式數字日期中，**只要首段為 4 位數，一律視為年份優先（`YYYY/M/D`）**，不受 ④ 設定影響；首段為 1~2 位數才落入 ④ 判斷。`2024/3/15` → 2024-03-15；`13/2/2024` 因首段 >12 自動判為 `D/M/YYYY` 不論設定。<br>**驗證**：解析後月份 1–12、日 1–31 且符合該月天數（含閏年），不合法視為無法解析。<br>**輸出格式選項**：`YYYY/MM/DD`（**預設**）/ `YYYY-MM-DD`，月日補零兩位 | 無法解析的值**保留原樣**並計入「未轉換」數 |

**UI 流程**：上傳 → 勾選操作與參數 → 預覽前 20 列前後對照 → 執行（批次處理 + 進度條）→ 結果統計（每操作的影響儲存格數 / 未轉換數）→ 匯出或送往其他工具。

**驗收標準**
- [ ] 各操作可任意組合並依列出順序執行
- [ ] 預覽對照高亮變更儲存格
- [ ] 50,000 列檔案執行期間 UI 不凍結，進度條更新
- [ ] 日期歧義樣例驗證：`2024/3/5`→`2024/03/05`；`3/5/2024` 依 UI 設定切換結果；`13/2/2024` 自動判為日先；非法日期（`2024/2/30`）保留原樣並計入未轉換

---

### 5.2 欄位工具 Column Tool（P0）`#column`

**功能**
1. **欄位拆分**：依分隔符（自訂字元）或固定長度，拆成 N 個新欄；新欄命名 `原欄_1`、`原欄_2`…；段數不一致時補空。
2. **Regex 抽取**：以 `safeCompile` 編譯，抽取第 1 個捕獲群組（或全匹配）成新欄；無匹配為空。
3. **多欄合併**：選 2 欄以上 + 自訂連接符，產生新欄；可選擇是否移除原欄。
4. **單步復原（Undo）**：每次操作前快照 headers + rows（限最近 1 步，超過 100,000 儲存格時停用並提示）。

**驗收標準**
- [ ] 拆分段數不一致補空、不錯位
- [ ] 危險 regex 被攔截並提示
- [ ] Undo 還原後與操作前完全一致

---

### 5.3 批次合併 Batch Merger（P1）`#merger`

- 上限：**30 個檔案 / 合計 500,000 列**，超限拒收並提示。
- 垂直堆疊，三種對齊策略：
  - **聯集（預設）**：所有欄取聯集，缺欄補空
  - **交集**：只保留全部檔案共有欄
  - **嚴格**：欄名與順序需完全一致，否則列出不一致檔案並中止
- **來源追蹤**：可選新增 `_來源檔名`、`_來源工作表` 欄。
- 檔案清單可拖曳排序、單檔移除、顯示各檔列數。

**驗收標準**
- [ ] 三策略結果正確，嚴格模式錯誤訊息指出具體檔案與差異欄
- [ ] 30 檔 / 50 萬列以內合併完成且 UI 不凍結

---

### 5.4 快速樞紐 Quick Pivot（P1）`#pivot`

- 分組維度：最多 **3 欄**。
- 聚合：**加總 / 計數 / 平均 / 最小 / 最大**；除計數外僅限數值欄（非數值儲存格忽略並統計忽略數）。
- 結果：表格（500 列上限）+ Chart.js 自動圖表：
  - 1 維 → 長條圖；分組值 ≤ 8 時可切換圓餅圖
  - 2 維 → 分組長條圖
  - 3 維 → 僅表格，提示「維度過多不繪圖」
- 匯出：結果表 XLSX / 圖表 PNG。

**驗收標準**
- [ ] 聚合數值與 Excel 樞紐一致（含空值/非數值忽略邏輯）
- [ ] 分組值 >50 時圖表提示過多並只取前 50 + 其他

---

### 5.5 格式轉換器 Format Converter（P2）`#converter`

- 雙向轉換：Excel ↔ CSV ↔ JSON。
- CSV 匯出選項：分隔符、是否含 BOM（預設含，利於 Excel 開啟）。
- JSON 進階：
  - **攤平（flatten）**：巢狀物件以 `a.b.c` 為欄名；陣列以 `a[0]` 索引；深度上限 5 層。
  - **還原（unflatten）**：欄名含 `.` / `[n]` 時可還原巢狀。
- JSON 檔上限 20MB。

**驗收標準**
- [ ] xlsx→csv→json→xlsx 來回轉換資料不失真（字串層面）
- [ ] flatten → unflatten 還原結構一致

---

### 5.6 Regex 測試器 Regex Tester（P2）`#regex`

- 即時測試：pattern + flags + 測試文字（≤ 200KB）。
- 高亮所有匹配（`escapeHtml` 後再包高亮標籤）；側欄列出各匹配的捕獲群組。
- 替換預覽：輸入替換字串即時顯示結果。
- ReDoS 防護：`safeMatch` 逾時 200ms 中止並提示「模式過於複雜」。
- 常用 pattern 範本（Email、手機、URL、日期等）一鍵套入。

**驗收標準**
- [ ] 含 `<script>` 的測試文字高亮顯示不執行
- [ ] 災難性回溯模式可被中止，頁面不凍結

---

### 5.7 JSON 檢視器 JSON Viewer（P3）`#json`

- 上限 20MB；解析失敗時顯示**錯誤位置**（行/列，前後文摘錄）。
- 樹狀檢視 **lazy-loading**：節點展開時才渲染子節點；陣列每 100 項分頁。
- 功能：全部摺疊/展開（展開限前 3 層）、key/value 搜尋（命中跳轉並展開路徑）、節點路徑複製（`a.b[2].c`）、格式化/壓縮輸出。

**驗收標準**
- [ ] 20MB 檔案開啟不凍結（首屏 < 2 秒）
- [ ] 非法 JSON 給出可定位的錯誤訊息

---

### 5.8 假資料產生器 Mock Data Generator（P3）`#mock`

- 自訂 schema：欄名 + 型別，型別包含：
  - 中文姓名、英文姓名、Email、手機號、整數（範圍）、小數（範圍/位數）、**日期（範圍，輸出 `YYYY/MM/DD`）**、布林、UUID、自訂清單隨機取值、流水號
- 列數上限 **100,000**，批次產生 + 進度條。
- 可設定空值比例（0–50%）模擬髒資料。
- 匯出 XLSX / CSV / JSON，或直接送往清洗器/健檢測試。

**驗收標準**
- [ ] 10 萬列產生 UI 不凍結
- [ ] 日期輸出格式為 `YYYY/MM/DD` 並落在指定範圍

---

## 六、路線圖

| 階段 | 內容 | 依賴 |
|------|------|------|
| Batch 0 | Parser / Uploader / Router / RegexUtil / 匯出 helper + 既有工具改接 | — |
| Batch A | #1 清洗器、#2 欄位工具 | Batch 0 |
| Batch B | #3 批次合併、#4 快速樞紐 | Batch 0 |
| Batch C | #5 格式轉換、#6 Regex 測試器 | Batch 0 |
| Batch D | #7 JSON 檢視器、#8 假資料產生器 | Batch 0 |

每階段完成後執行回歸：`#health`、`#diff` 必須功能不變。

---

## 七、驗收標準總表（摘要）

1. 全部工具離線可用，無外部請求。
2. `#health`、`#diff` 行為與 v1 完全一致。
3. 5 萬列以上操作皆有進度條且 UI 不凍結。
4. 任意含 HTML 的儲存格內容不會被當作 HTML 執行。
5. 日期處理符合 §5.1 之年份優先規則。
6. 各模組獨立驗收項（見各節）全數通過。

---

## 八、風險與限制

1. **記憶體上限**：純前端處理，50 萬列接近瀏覽器實際極限，已以上限 + 警告控管。
2. **CSV 方言**：自動偵測分隔符可能誤判，UI 提供手動覆寫。
3. **Undo 成本**：欄位工具快照限 1 步且有儲存格數上限。
4. **日期解析為啟發式**：清洗器日期統一採**年份優先**策略——首段為 4 位數一律解讀為 `YYYY/M/D`，可消除最常見的歧義；僅「年份在後」的格式（如 `3/5/2024`）仍有月日順序歧義，預設採 `M/D/YYYY`，UI 提供切換 `D/M/YYYY` 選項，並於該選項旁以文案提示「僅影響年份在後的日期」。
5. **Regex 逾時中斷**：JS 無法真正中斷同步 regex，採分段切割文字 + 逐段計時近似實現；極端模式仍可能短暫卡頓。

---
---

# 附錄：各階段 Codex 提示詞

> 使用方式：每階段開新對話，貼上「通用前置說明」+ 該階段提示詞。完成後先跑該階段驗收清單，再進下一階段。

---

## 通用前置說明

```
請在既有專案「Data Toolbox（離線版）」上開發新功能。

【專案現況】
- 純前端、完全離線：Vanilla JS (ES6+) + HTML5 + CSS3（深色模式），無打包工具、無後端、無外部請求。
- 既有函式庫：SheetJS (xlsx.full.min.js)、Chart.js (chart.umd.min.js)，皆為本地檔案。
- 既有功能：#health 資料健檢、#diff 資料比對，兩者已驗收，API 與行為「絕對不可破壞」。
- 架構：全域 App 命名空間，各模組為 IIFE，介面為 { init(container), destroy() }。

【硬性規範】
1. 跨工具資料格式統一為 App.State.current = { headers: string[], rows: any[][], meta: { sourceName, sheetName, totalRows } }。
2. 效能：批次處理每 tick 2,000–3,000 列（setTimeout 讓出主執行緒）；>50,000 列顯示警告；表格渲染上限 500 列；預覽 20 列；>1 秒的處理要有進度條。
3. 安全：所有動態插入 DOM 的使用者資料必須經 App.UI.escapeHtml()；使用者輸入的 regex 必須經 App.RegexUtil.safeCompile() 與 safeMatch()（逾時 200ms 中止）；禁止 eval / new Function。
4. UI 風格沿用既有深色模式 CSS 變數與元件樣式。
5. 程式碼註解與 UI 文案使用繁體中文。

完成後請列出：變更的檔案清單、新增的公開 API、以及如何手動驗證。
```

---

## Batch 0 提示詞：核心基礎建設

```
【本次任務：Batch 0 核心基礎建設】

請實作以下四個核心模組，並將既有 #health 與 #diff 改接新基礎設施（行為必須完全不變）：

1. App.Parser.parseToTable(input)
   - 輸入：File 物件（.xlsx/.xls/.csv/.tsv/.json）或 SheetJS sheet。
   - 回傳 Promise<{headers, rows, meta}>，rows 為二維陣列，值為字串或 null。
   - CSV：自動偵測分隔符（, ; \t |）與 UTF-8 BOM。
   - JSON：僅接受「物件陣列」，headers 取所有物件 key 的聯集，缺漏補 null。
   - 解析失敗回傳可讀的繁中錯誤訊息。

2. App.UI.createUploader(options)
   - options: { container, multiple, accept, onParsed(table), onError(msg) }
   - 支援點擊選檔與拖放；xlsx 多工作表時彈出工作表選擇 UI。
   - 解析前若估計超過 50,000 列，顯示警告並要求使用者確認。

3. App.UI 共用 helper
   - escapeHtml(str)
   - exportXLSX(table, filename) / exportCSV(table, filename, {delimiter, bom=true}) / exportJSON(table, filename) / exportPNG(canvas, filename)
   - renderCompareTable(before, after, options)：前後對照表，變更儲存格加高亮 class，渲染上限 500 列。

4. App.Router（註冊制）
   - App.Router.register({hash, group, title, module})；group 為「分析 / 處理 / 工具」。
   - 導覽列依 group 分組渲染；切換路由時呼叫前一模組 destroy()。
   - #health 與 #diff 以原 hash 註冊，直接輸入網址可用（向下相容）。

5. App.RegexUtil
   - safeCompile(pattern, flags) → {ok, regex, error}
   - safeMatch(regex, text, timeoutMs=200)：將長文字切段逐段執行並計時，逾時中止回傳 {timedOut: true}。
   - 靜態偵測巢狀量詞（如 (a+)+ ）並回傳警告字串。

【驗收】
- #health / #diff 改接 parseToTable 後行為不變。
- xlsx（多表）、csv、json 三種檔案上傳解析正常。
- escapeHtml 對 <script>、引號、& 正確轉義。
- 舊 hash 直連可用、分組導覽正常。
```

---

## Batch A 提示詞：資料清洗器 + 欄位工具

```
【本次任務：Batch A — #cleaner 資料清洗器、#column 欄位工具】
前置：Batch 0 已完成（Parser / Uploader / Router / RegexUtil / 匯出 helper 可直接使用）。

== 工具一：App.Cleaner（hash: #cleaner，group: 處理，標題: 資料清洗器）==

UI 流程：上傳 → 勾選操作（可多選、依下列順序執行）→ 設定參數 → 「預覽」顯示前 20 列前後對照（renderCompareTable）→ 「執行」批次處理 + 進度條 → 結果統計 → 匯出（XLSX/CSV/JSON）或「送往其他工具」（寫入 App.State.current 並切換路由）。

操作清單與規則：
1. 去除前後空白：trim 所有儲存格，含全形空白 \u3000。
2. 全形轉半形：數字、英文、常用符號；不動 CJK 文字。
3. 大小寫轉換：大寫/小寫/首字大寫，限使用者選定欄。
4. 移除空白列：整列皆空才移除。
5. 移除重複列：整列比對或指定鍵欄，保留第一筆。
6. 移除欄位：多選移除，至少保留 1 欄。
7. 空值填補：固定值 / 向下填補 / 平均值（平均值僅限可解析為數值的欄）。
8. 數字統一：去千分位、全形數字轉半形、統一小數位數；無法解析保留原樣。
9. 日期統一（重要，請嚴格依下列規則實作）：
   解析優先序（逐一嘗試，命中即停）：
   ① YYYY/M/D（分隔符 / - . 等價）
   ② YYYY年M月D日
   ③ Excel 日期序號：數值且介於 25569\~80000，且「該欄 ≥60% 的非空值符合此條件」才啟用序號解讀
   ④ 年份在後的 M/D/YYYY 或 D/M/YYYY：依 UI 設定解讀（預設 M/D/YYYY），選項旁標註「僅影響年份在後的日期」
   歧義消解：三段式日期只要「首段為 4 位數」一律視為 YYYY/M/D，不受 ④ 設定影響；首段 1\~2 位數才走 ④；若首段 >12（如 13/2/2024）自動判為 D/M/YYYY 不論設定。
   驗證：月 1–12、日符合該月天數（含閏年），不合法視為無法解析。
   輸出：YYYY/MM/DD（預設）或 YYYY-MM-DD，月日補零；無法解析的值保留原樣並計入「未轉換」數。

結果統計：每個操作顯示「影響儲存格數」與「未轉換數」。

== 工具二：App.ColumnTool（hash: #column，group: 處理，標題: 欄位工具）==

1. 欄位拆分：依自訂分隔符或固定長度拆成 N 欄，命名「原欄_1、原欄_2…」，段數不足補空。
2. Regex 抽取：safeCompile 編譯；抽取第 1 個捕獲群組（無群組則取全匹配）為新欄；無匹配為空；危險模式顯示警告。
3. 多欄合併：選 2+ 欄 + 自訂連接符產生新欄；可勾選移除原欄。
4. 單步 Undo：操作前快照 headers+rows（僅 1 步；總儲存格 >100,000 時停用快照並提示）。

每次操作後即時更新預覽表（上限 500 列）。

【驗收】
- 日期樣例：2024/3/5 → 2024/03/05；3/5/2024 依設定切換；13/2/2024 自動日先；2024/2/30 保留原樣計入未轉換。
- 50,000 列執行不凍結，進度條更新。
- 拆分段數不一致不錯位；Undo 還原與操作前一致。
- 回歸：#health、#diff 不受影響。
```

---

## Batch B 提示詞：批次合併 + 快速樞紐

```
【本次任務：Batch B — #merger 批次合併、#pivot 快速樞紐】
前置：Batch 0 已完成。

== 工具三：App.Merger（hash: #merger，group: 處理，標題: 批次合併）==

- createUploader({multiple: true})；上限 30 檔且合計 500,000 列，超限拒收並提示具體原因。
- 檔案清單：顯示檔名、工作表、列數；支援拖曳排序與單檔移除。
- 垂直堆疊，三種欄位對齊策略：
  1. 聯集（預設）：欄取聯集，缺欄補 null。
  2. 交集：只保留所有檔共有欄。
  3. 嚴格：欄名與順序需完全一致；否則列出「哪個檔案、差異欄名」並中止。
- 可勾選來源追蹤欄：_來源檔名、_來源工作表。
- 合併採批次處理 + 進度條；結果可匯出或送往其他工具。

== 工具四：App.Pivot（hash: #pivot，group: 分析，標題: 快速樞紐）==

- 資料來源：上傳或 App.State.current。
- 設定：分組欄最多 3 個；聚合函式 加總/計數/平均/最小/最大（除計數外僅限數值欄，非數值儲存格忽略並顯示忽略數）。
- 結果表：渲染上限 500 列，可匯出 XLSX。
- Chart.js 圖表：
  - 1 維分組 → 長條圖；分組值 ≤8 可切換圓餅圖。
  - 2 維分組 → 分組長條圖（第二維為系列）。
  - 3 維 → 不繪圖，顯示「維度過多，僅提供表格」。
  - 分組值 >50：只繪前 50 + 「其他」彙總，並提示。
  - 圖表可 exportPNG。

【驗收】
- 嚴格模式錯誤訊息指出具體檔案與差異欄。
- 30 檔 / 50 萬列內合併不凍結。
- 聚合結果與 Excel 樞紐一致（含空值與非數值忽略）。
- 回歸：#health、#diff 不受影響。
```

---

## Batch C 提示詞：格式轉換器 + Regex 測試器

```
【本次任務：Batch C — #converter 格式轉換器、#regex Regex 測試器】
前置：Batch 0 已完成。

== 工具五：App.Converter（hash: #converter，group: 工具，標題: 格式轉換器）==

- 雙向轉換：Excel ↔ CSV ↔ JSON（上傳任一格式，選擇目標格式匯出）。
- CSV 匯出選項：分隔符（, ; \t |）、是否含 UTF-8 BOM（預設含）。
- JSON 進階：
  - 攤平 flatten：巢狀物件 → 欄名 a.b.c；陣列 → a[0]；深度上限 5 層，超過提示。
  - 還原 unflatten：欄名含 . 或 [n] 時可還原巢狀 JSON。
- JSON 檔上限 20MB，超限拒收。
- 轉換前顯示 20 列預覽。

== 工具六：App.RegexTester（hash: #regex，group: 工具，標題: Regex 測試器）==

- 輸入：pattern、flags（g/i/m/s）、測試文字（textarea，上限 200KB）。
- 即時（debounce 300ms）：
  - 高亮所有匹配：先 escapeHtml 全文，再包高亮 span（注意轉義後的位移計算，建議以匹配索引切割原文後逐段轉義）。
  - 側欄列出每筆匹配的完整匹配與各捕獲群組。
  - 替換預覽：輸入替換字串即時顯示結果（支援 $1 $2）。
- 全程使用 App.RegexUtil：safeCompile 失敗顯示錯誤；safeMatch 逾時 200ms 中止並顯示「模式過於複雜，已中止」；巢狀量詞顯示警告。
- 內建範本下拉：Email、台灣手機、URL、日期（YYYY/M/D）等，一鍵套入。

【驗收】
- xlsx→csv→json→xlsx 來回轉換字串層面不失真；flatten→unflatten 結構一致。
- 測試文字含 <script> 時僅顯示文字不執行。
- 災難性回溯模式（如 (a+)+$ 對長字串）可被中止，頁面不凍結。
- 回歸：#health、#diff 不受影響。
```

---

## Batch D 提示詞：JSON 檢視器 + 假資料產生器

```
【本次任務：Batch D — #json JSON 檢視器、#mock 假資料產生器】
前置：Batch 0 已完成。

== 工具七：App.JsonViewer（hash: #json，group: 工具，標題: JSON 檢視器）==

- 輸入：上傳 .json 或貼上文字；上限 20MB。
- 解析失敗：顯示錯誤位置（行/列）與前後文摘錄（用 SyntaxError message 的 position 反推行列）。
- 樹狀檢視 lazy-loading：節點展開時才建立子節點 DOM；陣列每 100 項一頁（「載入更多」）。
- 功能：
  - 全部摺疊 / 展開（展開僅限前 3 層）
  - 搜尋 key 或 value：命中後自動展開路徑並捲動至節點，多筆可上一個/下一個
  - 節點右鍵或按鈕：複製路徑（格式 a.b[2].c）、複製該節點 JSON
  - 格式化（縮排 2 空白）/ 壓縮輸出，可下載
- 所有 key/value 顯示經 escapeHtml。

== 工具八：App.MockGen（hash: #mock，group: 工具，標題: 假資料產生器）==

- Schema 編輯器：可新增/刪除/排序欄位，每欄設定「欄名 + 型別 + 參數」。
- 型別：
  - 中文姓名、英文姓名、Email、台灣手機（09xxxxxxxx）
  - 整數（min/max）、小數（min/max/小數位數）
  - 日期（起迄範圍，輸出 YYYY/MM/DD）
  - 布林、UUID v4、自訂清單隨機取值（逗號分隔輸入）、流水號（起始值/步長）
- 列數上限 100,000；批次產生（每 tick 3,000 列）+ 進度條。
- 全域選項：空值比例 0–50%（隨機將儲存格設為空，模擬髒資料）。
- 輸出：預覽前 20 列；匯出 XLSX/CSV/JSON；「送往其他工具」寫入 App.State.current。

【驗收】
- 20MB JSON 開啟首屏 <2 秒、操作不凍結；非法 JSON 給出可定位錯誤。
- 10 萬列產生不凍結；日期輸出 YYYY/MM/DD 且在指定範圍內。
- 回歸：#health、#diff 不受影響。

【收尾】
本批完成後請執行全專案總驗收：
1. 八個新工具 + 兩個既有工具全部離線可用。
2. 任意含 HTML 的儲存格不被當 HTML 執行。
3. 導覽分組完整：分析（#health #diff #pivot）、處理（#cleaner #column #merger）、工具（#converter #regex #json #mock）。
```
