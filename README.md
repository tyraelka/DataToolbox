# 資料工具箱 Data Toolbox

離線資料處理工作台。純 HTML / CSS / JavaScript 打造,**不需要伺服器、不需要網路、不需要安裝**,直接開啟 `index.html` 就能使用,所有資料都在瀏覽器本機處理,不會離開你的電腦。

## 特色

- **完全離線**:字體、套件全部本地化(`vendor/`),斷網環境照常運作
- **零依賴框架**:原生 JavaScript,免建置、免安裝,clone 下來即用
- **跨工具資料流**:任一工具的處理結果可一鍵「送到」其他工具繼續加工
- **深淺雙主題**:跟隨系統偏好,也可手動切換,圖表配色同步更新

## 工具一覽

### 分析

| 工具 | 說明 |
| --- | --- |
| 健康檢查 | 列數/欄數/完整率/重複列統計,各欄空值率圖表,快速體檢資料品質 |
| 資料差異 | 兩份資料依鍵欄比對,標示新增/刪除/修改/未變更 |
| 快速透視 | 分組 + 匯總(計數/加總/平均/最小/最大),長條圖與圓餅圖 |

### 處理

| 工具 | 說明 |
| --- | --- |
| 資料清理 | 去前後空白、全形轉半形、移除空白列/重複列、數字與日期標準化,執行前可預覽差異 |
| 欄位工具 | 欄位切分、正則擷取、多欄合併,支援復原 |
| 批次合併 | 多檔合併(聯集/交集/嚴格模式),可附來源欄 |

### 工具

| 工具 | 說明 |
| --- | --- |
| 格式轉換 | CSV / XLSX / JSON 互轉,巢狀 JSON 展開與還原,可選 BOM 與分隔符 |
| 正則測試 | 即時比對與取代預覽,內建常用範本,具災難性回溯保護 |
| JSON 檢視 | 樹狀檢視、搜尋、排版與壓縮,支援大型檔案 |
| 模擬資料 | 產生測試資料(中英文姓名、Email、手機、日期、UUID 等),可控空值比例 |
| 文字格式化 | 輕量語法 + 按鈕工具列,輸出 Outlook 可貼上的格式化內容;Excel 範圍貼上自動轉表格 |
| 色彩調色盤 | 依色彩理論(互補/鄰近/三角/分裂互補/矩形/單色)即時產生配色,附深淺階與 12 組精選色盤,點擊即複製 HEX/RGB |

## 使用方式

```text
git clone https://github.com/tyraelka/DataToolbox.git
```

直接用瀏覽器開啟 `index.html` 即可,建議使用 Chrome / Edge。

支援的資料來源:`.xlsx`、`.xls`、`.csv`、`.tsv`、`.json`,以及剪貼簿貼上;多工作表的活頁簿會出現工作表選擇器。

## 專案結構

```text
├─ index.html            # 入口,依序載入 vendor → core → modules → app
├─ favicon.svg
├─ css/
│  ├─ style.css          # 只負責 @import
│  └─ parts/             # fonts / tokens / base / layout / components / tools
├─ js/
│  ├─ core/              # 共用層:狀態、UI、解析、路由、圖表、正則工具
│  ├─ modules/           # 12 個工具模組,皆實作 init(container) / destroy()
│  └─ app.js             # 開機與路由註冊
├─ vendor/
│  ├─ xlsx.full.min.js   # SheetJS
│  ├─ chart.umd.min.js   # Chart.js
│  └─ fonts/             # Noto Sans TC + IBM Plex Mono(本地化字體)
├─ tools/
│  └─ download-fonts.js  # 字體本地化腳本(一次性,node tools/download-fonts.js)
└─ docs/                 # 規劃與架構文件
```

## 開發備忘

- 所有顏色一律使用 `css/parts/tokens.css` 的 CSS 變數,深淺主題與圖表色盤(`--chart-1` ~ `--chart-8`)都在這裡定義
- UI 文案集中於 `js/core/shared.js` 的 `App.I18N`
- 新增工具:在 `js/modules/` 建立模組(實作 `init` / `destroy`)→ `app.js` 註冊路由 → `index.html` 加入 script
