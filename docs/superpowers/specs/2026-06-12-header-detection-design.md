# 髒數據表頭偵測（Header Detection）設計

> 日期：2026-06-12
> 狀態：已核准

## 問題

`App.Parser.aoaToTable()` 一律把第 0 列當表頭。實際髒數據中：

- 表頭之前可能有報表標題、說明列、空白列、合併儲存格殘留等雜訊列。
- 表頭可能跨多列：第一列是群組名（跨欄合併，例如 groupA、groupB），第二列是會重複的子欄名（h1、h2）。

錯誤的表頭會讓所有下游工具（健康檢查空值率、差異比對鍵欄、透視分組等）全部失準。

## 決策摘要

| 議題 | 決策 |
| --- | --- |
| 多列表頭欄名合成 | 群組名與子欄名以 `_` 連接（`groupA_h1`），群組名向右補填合併儲存格留下的空格 |
| 互動方式 | 自動偵測 + 上傳後顯示可調整預覽面板，確認後才進入工具 |
| 生效範圍 | 所有上傳入口（CSV/Excel）；JSON 以物件鍵名為欄名，不經偵測 |
| 偵測策略 | 啟發式評分引擎（掃描前 30 列；非空比例、文字/數值型別對比、合併儲存格訊號） |
| 批次合併例外 | 多檔上傳自動套用偵測，檔案清單以徽章顯示「跳過 N 列／表頭 M 列」，v1 不提供單檔重調 |

## 架構

### 1. 資料流

`App.Parser.parseToTable()` 對外簽名不變，回傳 `{headers, rows, meta}`，但 CSV/Excel 來源額外附帶：

```js
table.raw = {
  grid,    // 未切表頭的原始二維陣列
  merges,  // Excel !merges（CSV 為 []）
  detect   // { headerStart, headerRows, confidence }
}
```

既有模組不需修改。`normalizeTable()` / `cloneTable()` 不複製 `raw`，因此 raw 不會跟著資料在工具間流動。

新增 `App.Parser.rebuild(parsed, headerStart, headerRows)` 供確認面板以不同參數重新合成 table。

### 2. 新模組 `js/core/header-detect.js`（App.HeaderDetect）

純函式、無 DOM 依賴，同時支援瀏覽器（掛在 `App.HeaderDetect`）與 Node（CommonJS export）。

**`analyze(grid, merges)` → `{ headerStart, headerRows, confidence }`**

- 只掃前 30 列；先以樣本列的非空格數眾數（modal）當基準。
- 雜訊列：全空白，或非空格數 ≤ min(modal−1, max(2, modal×30%))。
- `headerStart` 候選：第一個非雜訊列；若該列以文字為主（文字比例 ≥ 0.6）即視為表頭。
- 群組列回收：從表頭候選列往上檢查，符合「全文字、無數值/日期、非空格數 ≥ 2（或有部分寬度的橫向合併儲存格）」的列併入表頭，總表頭列數上限 3。全寬合併的標題列不會被誤收（單一非空格且無部分寬度合併 → 視為標題）。
- 偵測不到合理表頭 → 回傳 `{headerStart: 0, headerRows: 1}`，等同現行行為。

**`build(grid, { headerStart, headerRows, merges })` → `{ headers, rows }`**

- 表頭列先依 `merges` 展開合併儲存格（含縱向），非末列再做水平 forward-fill。
- 各欄由上到下取非空片段、去除連續重複後以 `_` 連接；全空欄名補 `Column N`；最後去重（重複加 `_2` 後綴）。
- `headerRows = 0`：欄名為 `Column 1..N`（無表頭資料）。

### 3. 確認面板（`ui.js` createUploader）

- 單檔解析完成後，在 uploader 下方顯示面板：偵測摘要（「偵測結果：跳過 N 列雜訊，表頭 M 列」）、起始列 / 表頭列數兩個 number input（起始列上限 min(列數−1, 50)、表頭列數 0–3）、合成後欄名 + 前 8 列即時預覽、「確認使用」按鈕。
- 調整輸入即時呼叫 `App.Parser.rebuild()` 重算預覽；按確認才觸發 `onParsed`。
- 多工作表 Excel 切換 sheet 後重新偵測、重新顯示面板。
- JSON 來源（無 `raw`）直接 `onParsed`，不顯示面板。
- 批次上傳（`multiple: true`）不顯示面板，自動套用；merger 檔案清單對 `headerStart > 0 || headerRows > 1` 的檔案顯示徽章。

### 4. 邊界處理

- 全空 grid → 維持既有 `No rows found` 錯誤。
- 純數值無表頭資料 → 偵測退回 `headerStart=0, headerRows=1`（現行行為），使用者可在面板把表頭列數調成 0。
- 起始列調整上限 50。

### 5. 測試

`tools/test-header-detect.js`：Node 內建 `assert`，`node tools/test-header-detect.js` 執行。涵蓋：乾淨資料、標題+空白列+單列表頭、群組多列表頭（含 merges 與無 merges 兩種）、縱向合併表頭、無表頭（headerRows=0 build）、全空/退化輸入。
