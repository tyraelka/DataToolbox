# Data Toolbox Current Architecture

> Date: 2026-06-12
> Scope: current file structure, CSS split, JavaScript module split, static DOM, and JavaScript-generated dynamic DOM.

---

## 1. Project File Tree

```text
Data Toolbox/
├─ index.html
├─ css/
│  ├─ style.css
│  └─ parts/
│     ├─ tokens.css
│     ├─ base.css
│     ├─ layout.css
│     ├─ components.css
│     └─ tools.css
├─ js/
│  ├─ app.js
│  ├─ core/
│  │  ├─ shared.js
│  │  ├─ ui.js
│  │  ├─ parser.js
│  │  ├─ regex-util.js
│  │  ├─ charts.js
│  │  └─ router.js
│  └─ modules/
│     ├─ health-diff.js
│     ├─ cleaner.js
│     ├─ column-tool.js
│     ├─ merger.js
│     ├─ pivot.js
│     ├─ converter.js
│     ├─ regex-tester.js
│     ├─ json-viewer.js
│     └─ mock-gen.js
├─ vendor/
│  ├─ xlsx.full.min.js
│  └─ chart.umd.min.js
└─ docs/
   ├─ 2026-06-12-plan-toolbox.md
   ├─ 2026-06-12-plan-toolbox-en.md
   └─ 2026-06-12-current-toolbox-architecture.md
```

---

## 2. CSS Architecture Tree

```text
css/style.css
├─ @import "parts/tokens.css"
│  ├─ :root dark theme tokens
│  └─ html[data-theme="light"] light theme overrides
├─ @import "parts/base.css"
│  ├─ box sizing
│  ├─ body typography
│  ├─ form font inheritance
│  └─ .hidden
├─ @import "parts/layout.css"
│  ├─ .app-header
│  ├─ .brand-row
│  ├─ headings and subtitle
│  ├─ .nav-groups
│  ├─ .nav-group
│  ├─ .nav-label
│  ├─ .tab-btn
│  ├─ .icon-btn
│  ├─ main
│  ├─ .tool-grid
│  ├─ .two-col
│  ├─ .three-col
│  ├─ .tool-page
│  ├─ .source-panel
│  └─ responsive layout rules
├─ @import "parts/components.css"
│  ├─ .panel / .card
│  ├─ .dropzone
│  ├─ .field-row
│  ├─ .field-stack
│  ├─ form controls
│  ├─ .btn
│  ├─ .toolbar
│  ├─ .table-wrap
│  ├─ .data-table
│  ├─ changed / added / deleted row styles
│  ├─ .stats
│  ├─ .stat-card
│  ├─ .badge
│  ├─ .chart-box
│  └─ .file-list / .file-item
└─ @import "parts/tools.css"
   ├─ .regex-output
   ├─ .json-tree
   ├─ .pre-box
   ├─ .match-highlight
   ├─ JSON tree node classes
   ├─ #loading-overlay
   ├─ .loading-card
   ├─ .spinner
   ├─ .progress-track
   ├─ .progress-fill
   ├─ #toast-container
   └─ .toast variants
```

---

## 3. JavaScript Loading Order

`index.html` loads JavaScript in this exact order:

```text
vendor/xlsx.full.min.js
vendor/chart.umd.min.js
js/core/shared.js
js/core/ui.js
js/core/parser.js
js/core/regex-util.js
js/core/charts.js
js/core/router.js
js/modules/health-diff.js
js/modules/cleaner.js
js/modules/column-tool.js
js/modules/merger.js
js/modules/pivot.js
js/modules/converter.js
js/modules/regex-tester.js
js/modules/json-viewer.js
js/modules/mock-gen.js
js/app.js
```

Dependency direction:

```text
app.js
└─ requires every App module to already exist

modules/*
├─ require App.UI
├─ require App.Parser through uploader flows
├─ require App.State for cross-tool data
├─ require App.Router for send-to-tool flow
└─ some modules require:
   ├─ App.Charts
   └─ App.RegexUtil

core/router.js
├─ requires App.UI
├─ exposes App.Router
├─ exposes sourcePanel()
├─ exposes describeTable()
├─ exposes cloneTable()
└─ exposes sendExportBar()

core/ui.js
├─ requires App.Parser
├─ requires App.UI.escapeHtml internally
└─ exposes upload, render, toast, loading, and export helpers

core/shared.js
├─ defines App namespace
├─ defines App.I18N
├─ defines t()
├─ defines App.State
├─ defines normalizeTable()
├─ defines dedupeHeaders()
├─ defines App.Theme
└─ defines theme icons
```

---

## 4. JavaScript Module Tree

```text
App
├─ App.I18N
│  └─ Central Traditional Chinese UI strings using \uXXXX escapes
├─ App.State
│  ├─ current
│  └─ set(table)
├─ App.Theme
│  ├─ get()
│  ├─ set(name)
│  ├─ toggle()
│  ├─ updateButton()
│  └─ onChange(callback)
├─ App.UI
│  ├─ escapeHtml(value)
│  ├─ showLoading(message, percent)
│  ├─ setLoadingText(message, percent)
│  ├─ hideLoading()
│  ├─ toast(message, type, ms)
│  ├─ renderTable(container, headers, rows, maxRows)
│  ├─ renderCompareTable(before, after, options)
│  ├─ createUploader(options)
│  ├─ exportXLSX(table, filename)
│  ├─ exportCSV(table, filename, options)
│  ├─ exportJSON(table, filename)
│  ├─ exportPNG(canvas, filename)
│  ├─ download(filename, blob)
│  └─ tableToObjects(table)
├─ App.Parser
│  ├─ parseToTable(input, meta)
│  ├─ parseFile(file)
│  ├─ parseCSV(text, meta, delimiter)
│  └─ detectDelimiter(text)
├─ App.RegexUtil
│  ├─ safeCompile(pattern, flags)
│  ├─ safeMatch(regex, text, timeoutMs)
│  └─ nestedWarning(pattern)
├─ App.Charts
│  ├─ bar(id, labels, values, options)
│  ├─ pie(id, labels, values)
│  └─ destroy(id)
├─ App.Router
│  ├─ register(route)
│  ├─ init()
│  ├─ show(hash)
│  └─ sendToTool(table, hash)
├─ App.Health
│  └─ init(container), destroy()
├─ App.Diff
│  └─ init(container), destroy()
├─ App.Cleaner
│  └─ init(container), destroy()
├─ App.ColumnTool
│  └─ init(container), destroy()
├─ App.Merger
│  └─ init(container), destroy()
├─ App.Pivot
│  └─ init(container), destroy()
├─ App.Converter
│  └─ init(container), destroy()
├─ App.RegexTester
│  └─ init(container), destroy()
├─ App.JsonViewer
│  └─ init(container), destroy()
└─ App.MockGen
   └─ init(container), destroy()
```

---

## 5. Static HTML DOM Tree

This is the DOM that exists before `js/app.js` runs.

```text
html[lang="zh-Hant"][data-theme]
├─ head
│  ├─ meta[charset="utf-8"]
│  ├─ meta[name="viewport"]
│  ├─ title
│  ├─ inline theme bootstrap script
│  └─ link[href="css/style.css"]
└─ body
   ├─ header.app-header
   │  ├─ div.brand-row
   │  │  ├─ div
   │  │  │  ├─ h1#app-title
   │  │  │  └─ p#app-subtitle.subtitle
   │  │  └─ button#theme-toggle.icon-btn[type="button"]
   │  └─ nav#app-nav.nav-groups
   ├─ main#app-main
   ├─ div#loading-overlay.hidden[role="status"]
   │  └─ div.loading-card
   │     ├─ div.spinner
   │     ├─ p#loading-text
   │     └─ div.progress-track
   │        └─ div#loading-progress.progress-fill
   ├─ div#toast-container
   └─ scripts
      ├─ vendor/xlsx.full.min.js
      ├─ vendor/chart.umd.min.js
      ├─ js/core/*.js
      ├─ js/modules/*.js
      └─ js/app.js
```

---

## 6. Boot And Router Tree

`js/app.js` performs bootstrapping:

```text
boot()
├─ set #app-title text from App.I18N.app_title
├─ set #app-subtitle text from App.I18N.app_subtitle
├─ bind #theme-toggle click -> App.Theme.toggle()
├─ App.Theme.updateButton()
├─ register routes
│  ├─ #health    group analysis  module App.Health
│  ├─ #diff      group analysis  module App.Diff
│  ├─ #pivot     group analysis  module App.Pivot
│  ├─ #cleaner   group process   module App.Cleaner
│  ├─ #column    group process   module App.ColumnTool
│  ├─ #merger    group process   module App.Merger
│  ├─ #converter group utility   module App.Converter
│  ├─ #regex     group utility   module App.RegexTester
│  ├─ #json      group utility   module App.JsonViewer
│  └─ #mock      group utility   module App.MockGen
├─ App.Router.init()
├─ verify SheetJS vendor
└─ verify Chart.js vendor
```

Router-generated nav:

```text
nav#app-nav.nav-groups
├─ div.nav-group
│  ├─ span.nav-label => "分析"
│  ├─ button.tab-btn[data-hash="#health"]
│  ├─ button.tab-btn[data-hash="#diff"]
│  └─ button.tab-btn[data-hash="#pivot"]
├─ div.nav-group
│  ├─ span.nav-label => "處理"
│  ├─ button.tab-btn[data-hash="#cleaner"]
│  ├─ button.tab-btn[data-hash="#column"]
│  └─ button.tab-btn[data-hash="#merger"]
└─ div.nav-group
   ├─ span.nav-label => "工具"
   ├─ button.tab-btn[data-hash="#converter"]
   ├─ button.tab-btn[data-hash="#regex"]
   ├─ button.tab-btn[data-hash="#json"]
   └─ button.tab-btn[data-hash="#mock"]
```

Router page mounting:

```text
App.Router.show(hash)
├─ call previous route module.destroy()
├─ mark matching nav button active
├─ replace current location hash
├─ clear main#app-main
├─ append section.tool-page
└─ call active route module.init(section)
```

---

## 7. Shared Dynamic Components

### 7.1 `sourcePanel(onTable)`

Used by: Health, Cleaner, Column Tool, Pivot, Converter.

```text
div.panel.source-panel
├─ h2 => data source title
├─ div#upload-{random}
│  └─ generated by App.UI.createUploader()
├─ div.toolbar
│  └─ button.btn[data-use-current]
└─ p.muted[data-info]
```

### 7.2 `App.UI.createUploader(options)`

Generated inside the container passed to `createUploader`.

```text
upload container
├─ div.dropzone
├─ input.hidden[type="file"]
└─ div.field-row.hidden
   ├─ label => sheet label
   └─ select
```

Runtime behavior:

```text
dropzone click
└─ opens hidden file input

file input change
└─ parse selected files through App.Parser.parseToTable()

drag/drop
└─ parse dropped files through App.Parser.parseToTable()

multi-sheet workbook
└─ show sheet selector and reparse selected sheet
```

### 7.3 `sendExportBar(container, getTable)`

Appended to a result area after a tool has output data.

```text
div.toolbar
├─ button.btn[data-xlsx]
├─ button.btn[data-csv]
├─ button.btn[data-json]
└─ select[data-send]
   ├─ option[value=""] => send-to-tool label
   ├─ option[value="#health"]
   ├─ option[value="#diff"]
   ├─ option[value="#cleaner"]
   ├─ option[value="#column"]
   ├─ option[value="#merger"]
   ├─ option[value="#pivot"]
   ├─ option[value="#converter"]
   ├─ option[value="#regex"]
   ├─ option[value="#json"]
   └─ option[value="#mock"]
```

### 7.4 `App.UI.renderTable(container, headers, rows, maxRows)`

```text
target container
└─ div.table-wrap
   ├─ table.data-table
   │  ├─ thead
   │  │  └─ tr
   │  │     └─ th per header
   │  └─ tbody
   │     └─ tr per rendered row
   │        └─ td per cell
   └─ p.muted
      └─ only rendered when rows exceed render limit
```

### 7.5 `App.UI.renderCompareTable(before, after, options)`

```text
div.table-wrap
└─ table.data-table
   ├─ thead
   │  └─ tr
   │     ├─ th => row number
   │     └─ th per header
   └─ tbody
      └─ tr per preview row
         ├─ td => row number
         └─ td.cell-changed? per compared cell
            ├─ span.muted => before value
            ├─ br
            └─ after value
```

---

## 8. Route Dynamic DOM Trees

### 8.1 `#health` App.Health

```text
section.tool-page
└─ div.tool-grid
   ├─ div[data-source]
   │  └─ sourcePanel(onTable)
   └─ div
      └─ div.panel
         ├─ h2 => Health title
         ├─ div#health-stats.stats
         │  └─ generated stat cards
         │     ├─ rows
         │     ├─ columns
         │     ├─ complete rate
         │     └─ duplicate rows
         ├─ div#health-chart.chart-box.small
         │  └─ canvas#health-null-chart
         └─ div#health-table
            └─ generated table preview
```

Runtime additions:

```text
on table loaded
├─ App.State.set(table)
├─ profileTable(table)
├─ fill #health-stats
├─ render App.Charts.bar("health-null-chart")
└─ App.UI.renderTable(#health-table)
```

### 8.2 `#diff` App.Diff

```text
section.tool-page
├─ div.two-col
│  ├─ div.panel
│  │  ├─ h2 => old data
│  │  └─ div#diff-old
│  │     └─ createUploader()
│  └─ div.panel
│     ├─ h2 => new data
│     └─ div#diff-new
│        └─ createUploader()
└─ div.panel
   ├─ h2 => Diff title
   ├─ div.field-row
   │  ├─ label => key columns
   │  └─ select#diff-keys[multiple]
   ├─ div.toolbar
   │  └─ button#run-diff.btn.primary
   ├─ div#diff-summary.stats
   │  └─ generated stat cards
   │     ├─ added
   │     ├─ deleted
   │     ├─ modified
   │     └─ unchanged
   └─ div#diff-output
      └─ generated diff table
```

Runtime additions:

```text
after both tables loaded
└─ fill select#diff-keys with common columns

on compare
├─ diffTables(oldTable, newTable, keys)
├─ fill #diff-summary
└─ renderDiffOutput(#diff-output)
```

### 8.3 `#cleaner` App.Cleaner

```text
section.tool-page
└─ div.tool-grid
   ├─ div[data-source]
   │  └─ sourcePanel(onTable)
   └─ div.panel
      ├─ h2 => Cleaner title
      ├─ div.field-stack
      │  ├─ label > input[data-op="trim"]
      │  ├─ label > input[data-op="fullwidth"]
      │  ├─ label > input[data-op="empty"]
      │  ├─ label > input[data-op="dupe"]
      │  ├─ label > input[data-op="numbers"]
      │  └─ label > input[data-op="dates"]
      ├─ div.field-row
      │  ├─ label => year-last date mode
      │  ├─ select#date-mode
      │  │  ├─ option[value="mdy"]
      │  │  └─ option[value="dmy"]
      │  ├─ label => output format
      │  └─ select#date-output
      │     ├─ option[value="/"]
      │     └─ option[value="-"]
      ├─ div.toolbar
      │  ├─ button#clean-preview.btn
      │  └─ button#clean-run.btn.primary
      ├─ div#clean-stats.stats
      └─ div#clean-output
```

Runtime additions:

```text
on preview
└─ #clean-output receives renderCompareTable(before, cleaned)

on execute
├─ cleanBatched()
├─ App.State.set(result.table)
├─ #clean-stats generated from operation stats
├─ #clean-output receives renderTable()
└─ sendExportBar(#clean-output)
```

### 8.4 `#column` App.ColumnTool

```text
section.tool-page
└─ div.tool-grid
   ├─ div[data-source]
   │  └─ sourcePanel(onTable)
   └─ div.panel
      ├─ h2 => Column Tool title
      ├─ div.field-row
      │  ├─ label => column
      │  └─ select#col-main
      ├─ h3 => split
      ├─ div.field-row
      │  ├─ input#split-delim[type="text"]
      │  ├─ input#split-count[type="number"]
      │  └─ button#split-run.btn
      ├─ h3 => regex extract
      ├─ div.field-row
      │  ├─ input#regex-pattern[type="text"]
      │  ├─ input#regex-name[type="text"]
      │  └─ button#extract-run.btn
      ├─ h3 => merge columns
      ├─ div.field-row
      │  ├─ select#merge-cols[multiple]
      │  ├─ input#merge-joiner[type="text"]
      │  ├─ input#merge-name[type="text"]
      │  ├─ label > input#merge-remove[type="checkbox"]
      │  └─ button#merge-run.btn
      ├─ div.toolbar
      │  └─ button#undo-run.btn
      └─ div#column-output
```

Runtime additions:

```text
on table loaded or operation completed
├─ fill #col-main options
├─ fill #merge-cols options
├─ App.State.set(table)
└─ render #column-output table
```

### 8.5 `#merger` App.Merger

```text
section.tool-page
└─ div.panel
   ├─ h2 => Merger title
   ├─ div#merge-upload
   │  └─ createUploader({ multiple: true })
   ├─ div.field-row
   │  ├─ label => mode
   │  ├─ select#merge-mode
   │  │  ├─ option[value="union"]
   │  │  ├─ option[value="intersection"]
   │  │  └─ option[value="strict"]
   │  ├─ label > input#merge-source[type="checkbox"]
   │  └─ button#merge-run.btn.primary
   ├─ ul#merge-files.file-list
   │  └─ generated li.file-item per parsed table
   └─ div#merge-output
      └─ generated merged table
```

Runtime additions:

```text
on files parsed
├─ append parsed tables to internal tables[]
└─ renderList()
   └─ li.file-item
      ├─ span => table description
      └─ button[data-remove]

on execute
├─ mergeTables(tables, mode, source)
├─ App.State.set(result)
├─ render #merge-output table
└─ sendExportBar(#merge-output)
```

### 8.6 `#pivot` App.Pivot

```text
section.tool-page
└─ div.tool-grid
   ├─ div[data-source]
   │  └─ sourcePanel(onTable)
   └─ div.panel
      ├─ h2 => Pivot title
      ├─ div.field-row
      │  ├─ label => groups
      │  ├─ select#pivot-groups[multiple]
      │  ├─ label => value column
      │  ├─ select#pivot-value
      │  ├─ label => aggregation
      │  ├─ select#pivot-agg
      │  │  ├─ option[value="count"]
      │  │  ├─ option[value="sum"]
      │  │  ├─ option[value="avg"]
      │  │  ├─ option[value="min"]
      │  │  └─ option[value="max"]
      │  ├─ label > input#pivot-pie[type="checkbox"]
      │  └─ button#pivot-run.btn.primary
      ├─ div.chart-box
      │  └─ canvas#pivot-chart
      └─ div#pivot-output
```

Runtime additions:

```text
on table loaded
├─ fill #pivot-groups options
└─ fill #pivot-value options

on execute
├─ pivotTable(table, groups, value, agg)
├─ render #pivot-output table
├─ renderPivotChart()
│  └─ App.Charts.bar() or App.Charts.pie()
└─ sendExportBar(#pivot-output)
```

### 8.7 `#converter` App.Converter

```text
section.tool-page
└─ div.tool-grid
   ├─ div[data-source]
   │  └─ sourcePanel(onTable)
   └─ div.panel
      ├─ h2 => Converter title
      ├─ div.field-row
      │  ├─ label => target format
      │  ├─ select#conv-target
      │  │  ├─ option[value="csv"]
      │  │  ├─ option[value="xlsx"]
      │  │  └─ option[value="json"]
      │  ├─ label => delimiter
      │  ├─ select#conv-delim
      │  ├─ label > input#conv-bom[type="checkbox"]
      │  └─ button#conv-run.btn.primary
      ├─ div.toolbar
      │  ├─ button#conv-flatten.btn
      │  └─ button#conv-unflatten.btn
      └─ div#conv-output
```

Runtime additions:

```text
on table loaded
└─ render #conv-output preview table

on convert
├─ App.UI.exportCSV()
├─ App.UI.exportXLSX()
└─ App.UI.exportJSON()

on flatten
├─ flattenTable(table)
└─ render #conv-output preview table

on unflatten
└─ export unflattened JSON
```

### 8.8 `#regex` App.RegexTester

```text
section.tool-page
└─ div.panel
   ├─ h2 => Regex Tester title
   ├─ div.field-row
   │  ├─ input#rx-pattern[type="text"]
   │  ├─ input#rx-flags[type="text"]
   │  └─ select#rx-template
   │     ├─ option[value=""]
   │     ├─ option[value="email regex"]
   │     ├─ option[value="TW mobile regex"]
   │     ├─ option[value="URL regex"]
   │     └─ option[value="YYYY/M/D regex"]
   ├─ textarea#rx-text
   ├─ div.field-row
   │  ├─ input#rx-replace[type="text"]
   │  └─ span#rx-warn.badge.warning
   └─ div.two-col
      ├─ div
      │  ├─ h3 => matches
      │  └─ div#rx-output.regex-output
      └─ div
         ├─ h3 => details
         └─ div#rx-details.pre-box
```

Runtime additions:

```text
on debounced input
├─ App.RegexUtil.safeCompile()
├─ App.RegexUtil.safeMatch()
├─ #rx-warn receives warning or error text
├─ #rx-output receives highlighted escaped segments
└─ #rx-details receives match list and replace preview
```

### 8.9 `#json` App.JsonViewer

```text
section.tool-page
└─ div.panel
   ├─ h2 => JSON Viewer title
   ├─ div.toolbar
   │  ├─ input#json-file[type="file"][accept=".json"]
   │  ├─ button#json-parse.btn
   │  ├─ button#json-pretty.btn
   │  ├─ button#json-min.btn
   │  └─ input#json-search[type="search"]
   ├─ textarea#json-text
   ├─ div#json-error.muted
   └─ div#json-tree.json-tree
```

Runtime additions:

```text
on parse
├─ JSON.parse(textarea value)
├─ #json-error cleared or filled with parse context
└─ renderTree(container, query)
   └─ #json-tree receives recursive renderJsonNode()

renderJsonNode(value, path, query, depth)
└─ div.tree-node
   ├─ span.tree-key
   ├─ optional nested tree-node children
   └─ optional span.tree-value
```

### 8.10 `#mock` App.MockGen

```text
section.tool-page
└─ div.panel
   ├─ h2 => Mock Generator title
   ├─ div.toolbar
   │  ├─ button#mock-add.btn
   │  ├─ label => row count
   │  ├─ input#mock-rows[type="number"]
   │  ├─ label => null ratio
   │  ├─ input#mock-null[type="number"]
   │  └─ button#mock-run.btn.primary
   ├─ div#mock-fields
   │  └─ generated field rows
   └─ div#mock-output
```

Generated field row:

```text
div.field-row
├─ input[data-name][type="text"]
├─ select[data-type]
│  ├─ option[value="zhName"]
│  ├─ option[value="enName"]
│  ├─ option[value="email"]
│  ├─ option[value="mobile"]
│  ├─ option[value="integer"]
│  ├─ option[value="decimal"]
│  ├─ option[value="date"]
│  ├─ option[value="boolean"]
│  ├─ option[value="uuid"]
│  ├─ option[value="pick"]
│  └─ option[value="sequence"]
├─ input[data-param][type="text"]
└─ button[data-remove].btn.small.danger
```

Runtime additions:

```text
on init
├─ addField("序號", "sequence")
├─ addField("姓名", "zhName")
└─ addField("日期", "date")

on generate
├─ collect fields from #mock-fields .field-row
├─ generate rows in batches
├─ App.State.set(result)
├─ render #mock-output preview table
└─ sendExportBar(#mock-output)
```

---

## 9. Theme Runtime Tree

```text
inline head script
├─ read localStorage["toolbox-theme"]
├─ if empty, check prefers-color-scheme: light
└─ set html[data-theme="light" | "dark"] before first paint

App.Theme
├─ get()
├─ set(name)
│  ├─ set html[data-theme]
│  ├─ persist localStorage["toolbox-theme"]
│  ├─ update #theme-toggle icon
│  └─ dispatch document "themechange"
├─ toggle()
└─ onChange(callback)

App.Charts
└─ listens to "themechange"
   └─ rebuilds registered charts using current CSS variables
```

---

## 10. Cross-Tool Data Flow

```text
Tool output table
├─ headers: string[]
├─ rows: any[][]
└─ meta
   ├─ sourceName
   ├─ sheetName
   └─ totalRows

App.State.set(table)
├─ normalizeTable(table)
├─ assign App.State.current
└─ dispatch "statechange"

sourcePanel()
└─ "use current data" button
   ├─ cloneTable(App.State.current)
   └─ passes cloned table to current module

sendExportBar()
└─ select[data-send]
   ├─ App.State.set(getTable())
   └─ App.Router.show(target hash)
```

---

## 11. Generated Result Areas Summary

```text
Health
├─ #health-stats
├─ #health-null-chart
└─ #health-table

Diff
├─ #diff-keys
├─ #diff-summary
└─ #diff-output

Cleaner
├─ #clean-stats
└─ #clean-output

Column Tool
├─ #col-main
├─ #merge-cols
└─ #column-output

Merger
├─ #merge-files
└─ #merge-output

Pivot
├─ #pivot-groups
├─ #pivot-value
├─ #pivot-chart
└─ #pivot-output

Converter
└─ #conv-output

Regex Tester
├─ #rx-warn
├─ #rx-output
└─ #rx-details

JSON Viewer
├─ #json-error
└─ #json-tree

Mock Generator
├─ #mock-fields
└─ #mock-output
```

