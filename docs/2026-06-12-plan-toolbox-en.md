# Data Toolbox Expansion Plan v1.3 (English Edition, ASCII-safe)

> Version: v1.3
> Baseline: v1 (Data Health Check + Data Diff) accepted and stable.
> v1.2 -> v1.3 changes: (1) added Theme Toggler (light/dark) as core infrastructure;
> (2) plan and all source files must remain ASCII-only (see Encoding Policy).

---

## 0. Revision Summary

| # | Issue | Resolution |
|---|-------|-----------|
| 1 | Each tool parsed files independently | Unified `App.Parser.parseToTable()` standard table object |
| 2 | Duplicated upload UI | Unified `App.UI.createUploader()` (drag-drop, multi-file, multi-sheet) |
| 3 | Hardcoded routing | Registration-based `App.Router` with grouped nav; `#health` / `#diff` kept |
| 4 | Large files froze the UI | Batch processing (2,000-3,000 rows per tick) + progress bar |
| 5 | XSS risk | Mandatory `App.UI.escapeHtml()` for all dynamic rendering |
| 6 | ReDoS risk in regex tools | `App.RegexUtil` safe compile + execution timeout |
| 7 | No data flow between tools | Standardized `App.State.current` + "Send to tool" action |
| 8 | Scattered export logic | Unified XLSX / CSV / JSON / PNG export helpers |
| 9 | Ambiguous date parsing | Year-first policy: `YYYY/M/D` has top priority (see 5.1) |
| 10 | (NEW v1.3) Dark-only UI | `App.Theme`: light/dark toggle, persisted, system default |
| 11 | (NEW v1.3) cp950 mojibake when tools read files | Encoding Policy: all source files ASCII-only |

---

## 1. Encoding Policy (MANDATORY)

To avoid cp950 / UTF-8 misdetection by external tools (e.g., Codex reading files):

1. **All source files (HTML / CSS / JS) must contain ASCII characters only.**
2. UI labels are Traditional Chinese, but every non-ASCII string must be written
   with `\uXXXX` escapes inside one central strings module:

```js
// strings.js - ASCII-only file; renders Traditional Chinese at runtime
App.I18N = {
  nav_group_analysis: "\u5206\u6790",        // "Analysis"
  nav_group_process:  "\u8655\u7406",        // "Processing"
  nav_group_utility:  "\u5DE5\u5177",        // "Utility"
  theme_toggle_light: "\u6DFA\u8272\u6A21\u5F0F", // "Light mode"
  theme_toggle_dark:  "\u6DF1\u8272\u6A21\u5F0F"  // "Dark mode"
  // ... all other UI strings
};
```

3. HTML must declare `<meta charset="utf-8">` (unchanged), but the HTML file
   itself contains no raw non-ASCII characters; dynamic text comes from `App.I18N`.
4. Code comments: English only.
5. Test fixtures containing CJK content (e.g., date format samples) must be
   built at runtime from `\uXXXX` escapes, never stored as raw CJK literals.

---

## 2. Current Baseline (v1)

- Existing tools:
  - `#health` Data Health Check: type detection, null stats, duplicate rows, anomaly hints.
  - `#diff` Data Diff: row-by-row comparison, key alignment, difference highlighting.
- Stack: Vanilla JavaScript (ES6+), HTML5, CSS3. Local libraries only:
  SheetJS (`xlsx.full.min.js`), Chart.js (`chart.umd.min.js`).
- Fully offline: no network requests, no backend, no build tools.
- **Compatibility rule: new modules must NOT break the existing Health Check
  or Diff Engine APIs and behavior.**

---

## 3. Goal and Scope

Expand the app into an **offline data workbench v2** covering the full lifecycle:

```
Merge -> Clean -> Analyze -> Transform -> Compare
```

### New modules

| # | Module | Priority | Hash |
|---|--------|----------|------|
| 1 | Data Cleaner | P0 | `#cleaner` |
| 2 | Column Tool | P0 | `#column` |
| 3 | Batch Merger | P1 | `#merger` |
| 4 | Quick Pivot | P1 | `#pivot` |
| 5 | Format Converter | P2 | `#converter` |
| 6 | Regex Tester | P2 | `#regex` |
| 7 | JSON Viewer | P3 | `#json` |
| 8 | Mock Data Generator | P3 | `#mock` |

---

## 4. Shared Implementation Standards

### 4.1 Architecture

- Global `App` namespace; each module is an IIFE exposing `{ init(container), destroy() }`.
- Cross-tool data exchange via:

```js
App.State.current = {
  headers: ["colA", "colB"],
  rows: [["v1", "v2"], ...],   // 2D array; values are strings or null
  meta: { sourceName: "file.xlsx", sheetName: "Sheet1", totalRows: 1234 }
};
```

- Every result area offers a "Send to tool" dropdown: writes `App.State.current`
  then navigates via router.

### 4.2 Performance

| Item | Rule |
|------|------|
| Batch processing | 2,000-3,000 rows per tick via `setTimeout(fn, 0)` |
| Large file warning | > 50,000 rows requires user confirmation |
| Table render cap | Max 500 rows rendered; show "first 500 rows only" notice |
| Preview cap | 20 rows for pre-execution previews |
| Progress feedback | Any operation > 1 second shows progress bar + processed-row count |

### 4.3 Security

- **XSS**: every user-data insertion into the DOM must pass `App.UI.escapeHtml()`.
  Never concatenate unescaped strings into `innerHTML`.
- **ReDoS**: user-supplied regex must go through `App.RegexUtil.safeCompile()`;
  matching is chunked with a 200 ms timeout per row/segment.
- No `eval` / `new Function` on user input.

### 4.4 Theming (NEW in v1.3)

- All colors must use CSS custom properties; **no hardcoded colors in modules**.
- Two themes: `dark` (existing look) and `light`.
- See Batch 0, `App.Theme` for the full spec.

---

## 5. Batch 0: Core Infrastructure

### 5.1 `App.Parser.parseToTable(input)`

- Input: File object (`.xlsx/.xls/.csv/.tsv/.json`) or a SheetJS sheet.
- Returns `Promise<{headers, rows, meta}>` (standard format above).
- CSV: auto-detect delimiter (`,` `;` tab `|`) and UTF-8 BOM.
- JSON: accepts an array of objects only; headers = union of all keys; missing
  keys filled with null.
- Failure returns a readable error message (via `App.I18N`).

### 5.2 `App.UI.createUploader(options)`

```js
App.UI.createUploader({
  container: el,
  multiple: false,         // true for Batch Merger
  accept: [".xlsx", ".xls", ".csv", ".json"],
  onParsed: (table) => {},
  onError: (msg) => {}
});
```

- Click-to-select and drag-drop; sheet picker for multi-sheet workbooks.
- Built-in 50,000-row warning.

### 5.3 `App.UI` helpers

- `escapeHtml(str)`
- `exportXLSX(table, filename)` / `exportCSV(table, filename, {delimiter, bom: true})`
  / `exportJSON(table, filename)` / `exportPNG(canvas, filename)`
- `renderCompareTable(before, after, options)`: before/after table with changed
  cells highlighted; 500-row cap.

### 5.4 `App.Router` (registration-based)

```js
App.Router.register({
  hash: "#cleaner",
  group: "process",   // keys: "analysis" | "process" | "utility"
  titleKey: "tool_cleaner_title",   // resolved through App.I18N
  module: App.Cleaner
});
```

- Nav rendered by group; group labels resolved via `App.I18N`.
- `#health` and `#diff` registered with their original hashes (backward compatible).
- Router calls `destroy()` of the previous module on navigation.

### 5.5 `App.RegexUtil`

- `safeCompile(pattern, flags)` -> `{ok, regex, error}`
- `safeMatch(regex, text, timeoutMs = 200)`: chunked execution; on timeout
  returns `{timedOut: true}`.
- Static detection of nested quantifiers (e.g., `(a+)+`) -> warning string.

### 5.6 `App.Theme` (NEW)

- **Themes**: `dark` (default current look) and `light`.
- **Implementation**:
  - All colors defined as CSS custom properties on `:root` (dark defaults) and
    overridden under `[data-theme="light"]` on the `<html>` element.
  - Suggested token set: `--bg`, `--bg-elevated`, `--text`, `--text-muted`,
    `--border`, `--accent`, `--accent-contrast`, `--danger`, `--success`,
    `--warning`, `--highlight-changed`, `--table-stripe`.
- **API**:
  - `App.Theme.get()` -> `"dark" | "light"`
  - `App.Theme.set(name)` -> applies `data-theme`, persists, fires event
  - `App.Theme.toggle()`
  - `App.Theme.onChange(callback)` (or dispatch a `themechange` CustomEvent on
    `document`) so Chart.js charts can re-render with theme-appropriate colors.
- **Persistence**: `localStorage` key `toolbox-theme`. On first load with no
  stored value, follow `prefers-color-scheme`; fall back to `dark`.
- **UI**: a toggle button in the top nav (sun/moon glyph using inline SVG, no
  emoji, no external assets); accessible (`aria-label`, keyboard operable);
  applied before first paint (inline script in `<head>`) to avoid flash of
  wrong theme (FOUC).
- **Charts**: Chart.js axis/grid/label colors must read from CSS variables at
  render time; existing charts re-render on `themechange`.

**Batch 0 acceptance**
- [ ] Health Check and Diff behave identically after switching to `parseToTable()`.
- [ ] Uploader parses xlsx (multi-sheet), csv, json correctly.
- [ ] Grouped nav works; legacy hashes deep-link correctly.
- [ ] `escapeHtml` unit checks: `<script>`, quotes, `&` all escaped.
- [ ] Theme toggle switches light/dark instantly, persists across reloads,
      honors system preference on first visit, no FOUC, charts recolor.
- [ ] Every shipped source file is pure ASCII (verify with a non-ASCII scan).

---

## 6. Module Specifications

### 6.1 Data Cleaner (P0) `#cleaner`

Selectable operations, executed in listed order:

| Operation | Rule | Edge cases |
|-----------|------|-----------|
| Trim whitespace | Trim all cells, including full-width space `\u3000` | - |
| Full-width to half-width | Digits, ASCII letters, common symbols | Do not convert CJK text |
| Case conversion | upper / lower / capitalize, selected columns only | - |
| Remove empty rows | Remove only if every cell is empty | - |
| Remove duplicate rows | Whole-row match or selected key columns | Keep first occurrence |
| Remove columns | Multi-select | At least 1 column must remain |
| Fill nulls | Fixed value / forward-fill / numeric column mean | Mean only for numeric-parsable columns |
| Normalize numbers | Strip thousands separators, full-width digits to half-width, unify decimals | Unparsable values kept as-is |
| Normalize dates | **Year-first policy, see below** | Unparsable values kept as-is and counted as "unconverted" |

**Date parsing priority (try in order, stop on first match):**

1. `YYYY/M/D` (separators `/`, `-`, `.` are equivalent).
2. CJK date format `YYYY{U+5E74}M{U+6708}D{U+65E5}`
   (i.e., year/month/day marker characters; build the matcher from `\u5E74`,
   `\u6708`, `\u65E5` escapes -- ASCII-only source).
3. Excel serial numbers: numeric value in range 25569-80000, enabled only when
   **>= 60% of the column's non-empty values** qualify.
4. Year-last ambiguous formats `M/D/YYYY` or `D/M/YYYY`: interpreted per a UI
   toggle (default `M/D/YYYY`); label the toggle "affects year-last dates only".

**Disambiguation rules:**
- In any 3-segment numeric date, if the **first segment has 4 digits**, it is
  always `YYYY/M/D`, regardless of the toggle.
- Only 1-2 digit first segments fall into rule 4.
- If the first segment is > 12 (e.g., `13/2/2024`), it is automatically
  `D/M/YYYY` regardless of the toggle.

**Validation:** month 1-12, day valid for that month (leap years included);
invalid dates are treated as unparsable.

**Output format:** `YYYY/MM/DD` (default) or `YYYY-MM-DD`, zero-padded.

**UI flow:** upload -> select operations + params -> preview first 20 rows
(before/after via `renderCompareTable`) -> execute (batched + progress bar)
-> result stats (affected cells / unconverted count per operation) ->
export or send to another tool.

**Acceptance**
- [ ] Operations combine freely and execute in listed order.
- [ ] Preview highlights changed cells.
- [ ] 50,000-row run does not freeze UI; progress updates.
- [ ] Date samples: `2024/3/5` -> `2024/03/05`; `3/5/2024` follows the toggle;
      `13/2/2024` auto day-first; `2024/2/30` kept as-is and counted.

### 6.2 Column Tool (P0) `#column`

1. **Split**: by custom delimiter or fixed length into N columns named
   `origName_1`, `origName_2`, ...; pad missing segments with empty.
2. **Regex extract**: via `safeCompile`; capture group 1 (or whole match if no
   group) into a new column; no match -> empty; dangerous patterns warned.
3. **Merge columns**: 2+ columns + custom joiner -> new column; optional
   removal of source columns.
4. **Single-step Undo**: snapshot headers + rows before each operation
   (1 step only; disabled with notice when total cells > 100,000).

**Acceptance**
- [ ] Uneven split segment counts pad without misalignment.
- [ ] Dangerous regex blocked with warning.
- [ ] Undo restores exact pre-operation state.

### 6.3 Batch Merger (P1) `#merger`

- Limits: **30 files / 500,000 total rows**; reject with a specific reason.
- Vertical stacking; alignment strategies:
  - **Union (default)**: union of columns; missing cells -> null.
  - **Intersection**: keep columns present in all files.
  - **Strict**: headers and order must match exactly; otherwise list the
    offending file(s) and differing columns, then abort.
- Optional source-tracking columns: `_source_file`, `_source_sheet`
  (ASCII column names; UI labels via `App.I18N`).
- File list: shows name, sheet, row count; drag to reorder; remove individual files.

**Acceptance**
- [ ] Strict-mode error names the exact file and differing columns.
- [ ] 30 files / 500k rows merge without freezing.

### 6.4 Quick Pivot (P1) `#pivot`

- Group-by: up to **3 columns**.
- Aggregations: **sum / count / avg / min / max**; non-count aggregations are
  numeric-only (non-numeric cells ignored, ignored count displayed).
- Results: table (500-row cap) + Chart.js:
  - 1 dimension -> bar chart; pie option when distinct groups <= 8.
  - 2 dimensions -> grouped bar chart (second dim as series).
  - 3 dimensions -> table only with "too many dimensions" notice.
  - > 50 groups -> chart top 50 + "Other" bucket, with notice.
- Export: XLSX table / PNG chart. Charts must use theme CSS variables and
  re-render on `themechange`.

**Acceptance**
- [ ] Aggregates match Excel pivot results (incl. null/non-numeric handling).
- [ ] >50 groups handled with top-50 + Other.

### 6.5 Format Converter (P2) `#converter`

- Bi-directional: Excel <-> CSV <-> JSON.
- CSV export options: delimiter, UTF-8 BOM toggle (default ON for Excel).
- JSON advanced:
  - **Flatten**: nested objects -> `a.b.c` headers; arrays -> `a[0]`;
    max depth 5 (notice beyond).
  - **Unflatten**: headers containing `.` / `[n]` rebuild nested JSON.
- JSON file cap: 20 MB. Show 20-row preview before converting.

**Acceptance**
- [ ] xlsx -> csv -> json -> xlsx round trip is lossless at string level.
- [ ] flatten -> unflatten restores identical structure.

### 6.6 Regex Tester (P2) `#regex`

- Inputs: pattern, flags (g/i/m/s), test text (<= 200 KB), debounced 300 ms.
- Highlight all matches: split original text by match indices, escape each
  segment, then wrap highlights (never escape after wrapping).
- Side panel lists each match + capture groups.
- Replace preview with `$1 $2` support.
- ReDoS protection: `safeMatch` aborts at 200 ms with a "pattern too complex"
  notice; nested-quantifier warning shown.
- Built-in templates: Email, TW mobile, URL, date (`YYYY/M/D`), one-click insert.

**Acceptance**
- [ ] Test text containing `<script>` renders as text only.
- [ ] Catastrophic backtracking patterns are aborted; page stays responsive.

### 6.7 JSON Viewer (P3) `#json`

- Input: upload `.json` or paste text; cap 20 MB.
- Parse failure: show line/column (derived from SyntaxError position) plus a
  context excerpt.
- Lazy-loading tree: child nodes rendered on expand; arrays paginated 100 items
  per page ("load more").
- Features: collapse all / expand all (expand limited to first 3 levels);
  search keys/values (auto-expand path, scroll to node, prev/next navigation);
  copy node path (`a.b[2].c`); copy node JSON; pretty-print (2-space) /
  minify, downloadable.
- All keys/values rendered through `escapeHtml`.

**Acceptance**
- [ ] 20 MB file: first paint < 2 s, interaction never freezes.
- [ ] Invalid JSON yields a locatable error message.

### 6.8 Mock Data Generator (P3) `#mock`

- Schema editor: add/remove/reorder fields; each field = name + type + params.
- Types: Chinese full name, English full name, Email, TW mobile (`09xxxxxxxx`),
  integer (min/max), decimal (min/max/precision), **date (range, output
  `YYYY/MM/DD`)**, boolean, UUID v4, pick-from-custom-list (comma-separated),
  sequence (start/step).
- Row cap **100,000**; batched generation (3,000 rows per tick) + progress bar.
- Global option: null ratio 0-50% to simulate dirty data.
- Output: 20-row preview; export XLSX/CSV/JSON; "Send to tool".
- Chinese name pools must be defined via `\uXXXX` escapes (ASCII-only source).

**Acceptance**
- [ ] 100k rows generated without freezing.
- [ ] Dates output as `YYYY/MM/DD` within the configured range.

---

## 7. Roadmap

| Batch | Content | Depends on |
|-------|---------|-----------|
| Batch 0 | Parser / Uploader / Router / RegexUtil / export helpers / **Theme** + retrofit existing tools | - |
| Batch A | #1 Cleaner, #2 Column Tool | Batch 0 |
| Batch B | #3 Batch Merger, #4 Quick Pivot | Batch 0 |
| Batch C | #5 Format Converter, #6 Regex Tester | Batch 0 |
| Batch D | #7 JSON Viewer, #8 Mock Generator | Batch 0 |

After each batch, run regression: `#health` and `#diff` must be unchanged.

---

## 8. Global Acceptance Summary

1. All tools work fully offline; zero external requests.
2. `#health` / `#diff` behave exactly as v1.
3. Any 50k+ row operation shows progress and never freezes the UI.
4. Cell content containing HTML is never executed as HTML.
5. Date handling follows the year-first policy (6.1).
6. Theme toggle works everywhere; both themes meet readable contrast; no FOUC.
7. All source files are ASCII-only (automated scan passes).
8. Per-module acceptance checklists all pass.

---

## 9. Risks and Limitations

1. **Memory ceiling**: 500k rows approaches practical browser limits; enforced
   caps + warnings.
2. **CSV dialects**: delimiter auto-detection can misfire; manual override in UI.
3. **Undo cost**: single-step snapshot with a cell-count cap.
4. **Heuristic date parsing**: year-first policy removes the most common
   ambiguity; only year-last formats (e.g., `3/5/2024`) remain ambiguous,
   default `M/D/YYYY` with a UI toggle.
5. **Regex timeout is approximate**: JS cannot truly interrupt a synchronous
   regex; chunked text + per-chunk timing approximates it; extreme patterns may
   still cause brief jank.
6. **Theme retrofitting**: legacy CSS may contain hardcoded colors; Batch 0
   must migrate them all to CSS variables (audit required).

---
---

# Appendix: Codex Prompts per Batch (English)

> Usage: start a fresh session per batch; paste the Common Preamble + the
> batch prompt. Run the batch acceptance checklist before moving on.

---

## Common Preamble (paste before every batch prompt)

```
You are a senior front-end engineer working on an existing project:
"Data Toolbox" (offline edition).

PROJECT FACTS
- Pure front-end, fully offline: Vanilla JS (ES6+), HTML5, CSS3. No bundler,
  no backend, no network requests.
- Local libraries only: SheetJS (xlsx.full.min.js), Chart.js (chart.umd.min.js).
- Existing accepted tools: #health (Data Health Check) and #diff (Data Diff).
  Their APIs and behavior MUST NOT change.
- Architecture: global App namespace; each module is an IIFE exposing
  { init(container), destroy() }.

HARD RULES
1. Cross-tool data format: App.State.current =
   { headers: string[], rows: any[][], meta: { sourceName, sheetName, totalRows } }.
2. Performance: batch processing 2,000-3,000 rows per tick (setTimeout to yield);
   warn above 50,000 rows; render at most 500 table rows; previews show 20 rows;
   any >1s operation shows a progress bar.
3. Security: every user-data DOM insertion goes through App.UI.escapeHtml();
   user regex goes through App.RegexUtil.safeCompile()/safeMatch() (200 ms
   timeout); no eval / new Function.
4. Theming: use CSS custom properties only; never hardcode colors; both light
   and dark themes must look correct; re-render charts on the "themechange"
   event using current CSS variable values.
5. ENCODING POLICY (critical): every source file must be pure ASCII.
   UI labels are Traditional Chinese but MUST be written as \uXXXX escapes
   inside the central App.I18N strings module (strings.js). Code comments in
   English only. No raw non-ASCII characters anywhere in the repo.

DELIVERABLES PER TASK
- List of changed files, new public APIs, and manual verification steps.
- Confirm an ASCII-only scan of all touched files passes.
```

---

## Batch 0 Prompt: Core Infrastructure + Theme

```
TASK: Batch 0 - core infrastructure. Implement the modules below and retrofit
#health and #diff onto them with zero behavior change.

1. App.Parser.parseToTable(input)
   - Input: File (.xlsx/.xls/.csv/.tsv/.json) or a SheetJS sheet.
   - Returns Promise<{headers, rows, meta}>; rows is a 2D array of strings/null.
   - CSV: auto-detect delimiter (, ; tab |) and UTF-8 BOM.
   - JSON: array-of-objects only; headers = union of keys; missing -> null.
   - Failures return readable messages resolved via App.I18N.

2. App.UI.createUploader(options)
   - options: { container, multiple, accept, onParsed(table), onError(msg) }
   - Click-to-select and drag-drop; sheet picker for multi-sheet xlsx.
   - Warn and require confirmation above ~50,000 estimated rows.

3. App.UI helpers
   - escapeHtml(str)
   - exportXLSX(table, filename) / exportCSV(table, filename, {delimiter, bom=true})
     / exportJSON(table, filename) / exportPNG(canvas, filename)
   - renderCompareTable(before, after, options): before/after comparison with a
     highlight class on changed cells; 500-row render cap.

4. App.Router (registration-based)
   - App.Router.register({hash, group, titleKey, module}); groups:
     "analysis" | "process" | "utility"; labels and titles resolved via App.I18N.
   - Nav rendered by group; previous module's destroy() called on navigation.
   - Register #health and #diff with their original hashes (deep links work).

5. App.RegexUtil
   - safeCompile(pattern, flags) -> {ok, regex, error}
   - safeMatch(regex, text, timeoutMs=200): chunked execution; on timeout
     return {timedOut: true}.
   - Static nested-quantifier detection (e.g., (a+)+) -> warning string.

6. App.Theme (NEW)
   - Themes "dark" (current look, default) and "light".
   - All colors as CSS custom properties on :root (dark values) overridden under
     html[data-theme="light"]. Migrate ALL existing hardcoded colors to tokens:
     --bg, --bg-elevated, --text, --text-muted, --border, --accent,
     --accent-contrast, --danger, --success, --warning, --highlight-changed,
     --table-stripe (extend as needed).
   - API: App.Theme.get() / set(name) / toggle(); dispatch a "themechange"
     CustomEvent on document when the theme changes.
   - Persistence: localStorage key "toolbox-theme"; first visit follows
     prefers-color-scheme, fallback dark.
   - Apply the stored theme via a tiny inline <head> script before first paint
     (no flash of wrong theme).
   - Nav toggle button: inline SVG sun/moon, aria-label from App.I18N,
     keyboard operable.
   - Chart.js charts read colors from CSS variables at render time and
     re-render on "themechange".

7. strings.js (App.I18N)
   - Central ASCII-only strings module; all Traditional Chinese UI text as
     \uXXXX escapes. Move existing raw CJK literals (if any) into it.

ACCEPTANCE
- #health / #diff behavior unchanged after retrofit.
- xlsx (multi-sheet), csv, json upload and parse correctly.
- Grouped nav works; legacy hash deep links work.
- escapeHtml escapes <script>, quotes, ampersand.
- Theme: toggle works instantly, persists across reloads, honors system
  preference on first visit, no FOUC, both themes readable, charts recolor.
- ASCII-only scan passes on every file in the repo.
```

---

## Batch A Prompt: Data Cleaner + Column Tool

```
TASK: Batch A - implement #cleaner (Data Cleaner) and #column (Column Tool).
Prerequisite: Batch 0 complete (Parser / Uploader / Router / RegexUtil /
export helpers / Theme / App.I18N available).

== Tool 1: App.Cleaner (hash #cleaner, group "process") ==

UI flow: upload -> select operations (multi-select, executed in the order
below) -> set params -> "Preview" shows first 20 rows before/after via
renderCompareTable -> "Execute" with batching + progress bar -> result stats ->
export (XLSX/CSV/JSON) or "Send to tool" (write App.State.current and route).

Operations and rules:
1. Trim whitespace: all cells, including full-width space \u3000.
2. Full-width to half-width: digits, ASCII letters, common symbols; never CJK text.
3. Case conversion: upper/lower/capitalize, selected columns only.
4. Remove empty rows: only if every cell is empty.
5. Remove duplicate rows: whole-row or selected key columns; keep first.
6. Remove columns: multi-select; at least 1 column must remain.
7. Fill nulls: fixed value / forward fill / mean (numeric-parsable columns only).
8. Normalize numbers: strip thousands separators, full-width digits to
   half-width, unify decimal places; unparsable values kept as-is.
9. Normalize dates (implement EXACTLY):
   Priority order (try each, stop at first match):
   (1) YYYY/M/D with separators / - . treated as equivalent.
   (2) CJK pattern YYYY \u5E74 M \u6708 D \u65E5 (build regex from these
       escapes; source stays ASCII).
   (3) Excel serial: numeric within 25569-80000, enabled only when >= 60% of
       the column's non-empty values qualify.
   (4) Year-last M/D/YYYY or D/M/YYYY per a UI toggle (default M/D/YYYY);
       label it "affects year-last dates only" (via App.I18N).
   Disambiguation: a 4-digit first segment is ALWAYS YYYY/M/D regardless of
   the toggle; 1-2 digit first segments use rule (4); first segment > 12
   (e.g., 13/2/2024) forces D/M/YYYY regardless of the toggle.
   Validation: month 1-12, day valid for month incl. leap years; invalid ->
   unparsable.
   Output: YYYY/MM/DD (default) or YYYY-MM-DD, zero-padded; unparsable values
   kept as-is and counted as "unconverted".

Result stats: per operation, show affected-cell count and unconverted count.

== Tool 2: App.ColumnTool (hash #column, group "process") ==

1. Split: by custom delimiter or fixed length into N columns named
   origName_1, origName_2, ...; pad missing segments with empty strings.
2. Regex extract: safeCompile; capture group 1 (whole match if no group) into
   a new column; no match -> empty; show dangerous-pattern warnings.
3. Merge columns: 2+ columns + custom joiner -> new column; optional removal
   of source columns.
4. Single-step Undo: snapshot headers+rows before each operation (1 step only;
   disable with a notice when total cells > 100,000).

Live preview table (500-row cap) refreshes after each operation.

ACCEPTANCE
- Date samples: "2024/3/5" -> "2024/03/05"; "3/5/2024" follows the toggle;
  "13/2/2024" auto day-first; "2024/2/30" kept as-is, counted unconverted.
- 50,000-row execution stays responsive with live progress.
- Uneven splits pad without misalignment; Undo restores exact prior state.
- Both tools correct in light AND dark themes.
- Regression: #health and #diff unchanged. ASCII-only scan passes.
```

---

## Batch B Prompt: Batch Merger + Quick Pivot

```
TASK: Batch B - implement #merger (Batch Merger) and #pivot (Quick Pivot).
Prerequisite: Batch 0 complete.

== Tool 3: App.Merger (hash #merger, group "process") ==

- createUploader({multiple: true}); caps: 30 files and 500,000 total rows;
  reject over-limit input with a specific reason.
- File list: name, sheet, row count; drag to reorder; remove single files.
- Vertical stacking with three alignment strategies:
  1. Union (default): union of columns; missing cells -> null.
  2. Intersection: keep only columns present in every file.
  3. Strict: headers and order must match exactly; otherwise list the exact
     offending file(s) and differing column names, then abort.
- Optional source-tracking columns "_source_file" and "_source_sheet"
  (ASCII header names; UI labels via App.I18N).
- Batched merge + progress bar; result exportable or sendable to other tools.

== Tool 4: App.Pivot (hash #pivot, group "analysis") ==

- Data source: upload or App.State.current.
- Config: up to 3 group-by columns; aggregations sum/count/avg/min/max
  (non-count are numeric-only; ignore non-numeric cells and show ignored count).
- Result table: 500-row cap; XLSX export.
- Chart.js:
  - 1 dimension -> bar chart; pie toggle when distinct groups <= 8.
  - 2 dimensions -> grouped bar chart (second dimension as series).
  - 3 dimensions -> table only, with a "too many dimensions" notice.
  - \> 50 groups -> chart top 50 + "Other" bucket, with a notice.
  - Chart colors come from CSS variables; re-render on "themechange";
    exportPNG supported.

ACCEPTANCE
- Strict-mode errors name the exact file and differing columns.
- 30 files / 500k rows merge without freezing.
- Aggregates match Excel pivot output (incl. null/non-numeric handling).
- Charts readable in both themes and recolor on toggle.
- Regression: #health and #diff unchanged. ASCII-only scan passes.
```

---

## Batch C Prompt: Format Converter + Regex Tester

```
TASK: Batch C - implement #converter (Format Converter) and #regex (Regex Tester).
Prerequisite: Batch 0 complete.

== Tool 5: App.Converter (hash #converter, group "utility") ==

- Bi-directional conversion: Excel <-> CSV <-> JSON (upload any, pick target).
- CSV export options: delimiter (, ; tab |), UTF-8 BOM toggle (default ON).
- JSON advanced:
  - Flatten: nested objects -> "a.b.c" headers; arrays -> "a[0]"; max depth 5
    with a notice beyond.
  - Unflatten: headers containing "." or "[n]" rebuild nested JSON.
- JSON file cap 20 MB (reject above). Show a 20-row preview before converting.

== Tool 6: App.RegexTester (hash #regex, group "utility") ==

- Inputs: pattern, flags (g/i/m/s), test text textarea (cap 200 KB).
- Live (300 ms debounce):
  - Highlight all matches. IMPORTANT: split the ORIGINAL text at match indices,
    escapeHtml each segment, then wrap match segments in highlight spans.
    Never compute indices on escaped text.
  - Side panel: each match's full text + capture groups.
  - Replace preview with $1/$2 support.
- Use App.RegexUtil throughout: compile errors shown; safeMatch aborts at
  200 ms with a "pattern too complex, aborted" notice; nested-quantifier
  warning displayed.
- Template dropdown: Email, TW mobile, URL, date (YYYY/M/D); one-click insert.

ACCEPTANCE
- xlsx -> csv -> json -> xlsx round trip lossless at string level;
  flatten -> unflatten structure identical.
- Test text containing <script> renders as plain text.
- Catastrophic patterns (e.g., (a+)+$ on long input) abort; page responsive.
- Both tools correct in light and dark themes.
- Regression: #health and #diff unchanged. ASCII-only scan passes.
```

---

## Batch D Prompt: JSON Viewer + Mock Data Generator

```
TASK: Batch D - implement #json (JSON Viewer) and #mock (Mock Data Generator).
Prerequisite: Batch 0 complete.

== Tool 7: App.JsonViewer (hash #json, group "utility") ==

- Input: upload .json or paste text; cap 20 MB.
- Parse failure: report line/column (derive from SyntaxError position) plus a
  short context excerpt around the error.
- Lazy-loading tree: render children only on expand; paginate arrays 100 items
  per page with "load more".
- Features:
  - Collapse all / expand all (expand limited to first 3 levels).
  - Search keys/values: auto-expand the path, scroll to the node,
    prev/next navigation across hits.
  - Copy node path (format a.b[2].c) and copy node JSON.
  - Pretty-print (2-space indent) / minify; downloadable output.
- All keys/values rendered via escapeHtml.

== Tool 8: App.MockGen (hash #mock, group "utility") ==

- Schema editor: add/remove/reorder fields; each field = name + type + params.
- Types:
  - Chinese full name (name pools defined with \uXXXX escapes only),
    English full name, Email, TW mobile (09xxxxxxxx)
  - Integer (min/max), decimal (min/max/precision)
  - Date (start/end range, output YYYY/MM/DD)
  - Boolean, UUID v4, pick-from-custom-list (comma-separated input),
    sequence (start/step)
- Row cap 100,000; batched generation (3,000 rows per tick) + progress bar.
- Global option: null ratio 0-50% (randomly blank cells to simulate dirty data).
- Output: 20-row preview; export XLSX/CSV/JSON; "Send to tool" writes
  App.State.current.

ACCEPTANCE
- 20 MB JSON: first paint < 2 s; interaction never freezes; invalid JSON gives
  a locatable error.
- 100k-row generation stays responsive; dates are YYYY/MM/DD within range.
- Regression: #health and #diff unchanged. ASCII-only scan passes.

FINAL PROJECT ACCEPTANCE (run after this batch)
1. All 8 new tools + 2 legacy tools work fully offline.
2. No cell content is ever executed as HTML.
3. Nav groups complete: analysis (#health #diff #pivot),
   process (#cleaner #column #merger),
   utility (#converter #regex #json #mock).
4. Theme toggle works on every page, persists, no FOUC, charts recolor.
5. Repo-wide ASCII-only scan passes.
```
