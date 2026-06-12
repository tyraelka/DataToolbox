"use strict";

  window.App = window.App || {};
  var App = window.App;
  var ROW_WARN = 50000;
  var RENDER_CAP = 500;
  var PREVIEW_CAP = 20;
  var BATCH = 3000;

  function tick() {
    return new Promise(function (resolve) { setTimeout(resolve, 0); });
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  App.I18N = {
    app_title: "\u8cc7\u6599\u5de5\u5177\u7bb1",
    app_subtitle: "\u96e2\u7dda\u8cc7\u6599\u8655\u7406\u5de5\u4f5c\u53f0",
    group_analysis: "\u5206\u6790",
    group_process: "\u8655\u7406",
    group_utility: "\u5de5\u5177",
    tool_health: "\u5065\u5eb7\u6aa2\u67e5",
    tool_diff: "\u8cc7\u6599\u5dee\u7570",
    tool_cleaner: "\u8cc7\u6599\u6e05\u7406",
    tool_column: "\u6b04\u4f4d\u5de5\u5177",
    tool_merger: "\u6279\u6b21\u5408\u4f75",
    tool_pivot: "\u5feb\u901f\u900f\u8996",
    tool_converter: "\u683c\u5f0f\u8f49\u63db",
    tool_regex: "\u6b63\u5247\u6e2c\u8a66",
    tool_json: "JSON \u6aa2\u8996",
    tool_mock: "\u6a21\u64ec\u8cc7\u6599",
    upload_hint: "\u9ede\u64ca\u6216\u62d6\u653e\u6a94\u6848",
    use_current: "\u4f7f\u7528\u76ee\u524d\u8cc7\u6599",
    preview: "\u9810\u89bd",
    execute: "\u57f7\u884c",
    export_csv: "\u532f\u51fa CSV",
    export_xlsx: "\u532f\u51fa XLSX",
    export_json: "\u532f\u51fa JSON",
    export_png: "\u532f\u51fa PNG",
    send_to_tool: "\u9001\u5230\u5de5\u5177",
    rows: "\u5217\u6578",
    cols: "\u6b04\u6578",
    theme_light: "\u5207\u63db\u6dfa\u8272\u6a21\u5f0f",
    theme_dark: "\u5207\u63db\u6df1\u8272\u6a21\u5f0f",
    first_500: "\u50c5\u986f\u793a\u524d 500 \u5217",
    no_data: "\u5c1a\u7121\u8cc7\u6599",
    done: "\u5b8c\u6210",
    error: "\u932f\u8aa4",
    loading: "\u8655\u7406\u4e2d",
    data_source: "\u8cc7\u6599\u4f86\u6e90",
    sheet: "\u5de5\u4f5c\u8868",
    row_no: "\u5217\u865f",
    old_data: "\u820a\u8cc7\u6599",
    new_data: "\u65b0\u8cc7\u6599",
    key_columns: "\u6bd4\u5c0d\u9375\u6b04",
    added: "\u65b0\u589e",
    deleted: "\u522a\u9664",
    modified: "\u4fee\u6539",
    unchanged: "\u672a\u8b8a\u66f4",
    complete_rate: "\u5b8c\u6574\u7387",
    duplicate_rows: "\u91cd\u8907\u5217",
    null_rate: "\u7a7a\u503c\u7387",
    clean_trim: "\u6e05\u9664\u524d\u5f8c\u7a7a\u767d",
    clean_fullwidth: "\u5168\u5f62\u8f49\u534a\u5f62",
    clean_empty: "\u79fb\u9664\u7a7a\u767d\u5217",
    clean_dupe: "\u79fb\u9664\u91cd\u8907\u5217",
    clean_numbers: "\u6578\u5b57\u6a19\u6e96\u5316",
    clean_dates: "\u65e5\u671f\u6a19\u6e96\u5316",
    date_year_last: "\u5e74\u4efd\u5728\u5f8c",
    output_format: "\u8f38\u51fa\u683c\u5f0f",
    column: "\u6b04\u4f4d",
    split: "\u5207\u5206",
    delimiter: "\u5206\u9694\u7b26",
    regex_extract: "\u6b63\u5247\u64f7\u53d6",
    pattern: "\u689d\u4ef6\u5f0f",
    new_column: "\u65b0\u6b04\u540d",
    merge_columns: "\u5408\u4f75\u6b04\u4f4d",
    joiner: "\u9023\u63a5\u7b26",
    remove_source: "\u79fb\u9664\u4f86\u6e90\u6b04",
    undo: "\u5fa9\u539f",
    mode: "\u6a21\u5f0f",
    union: "\u806f\u96c6",
    intersection: "\u4ea4\u96c6",
    strict: "\u56b4\u683c",
    source_columns: "\u4f86\u6e90\u6b04\u4f4d",
    groups: "\u5206\u7d44\u6b04",
    value_column: "\u6578\u503c\u6b04",
    aggregation: "\u532f\u7e3d",
    agg_count: "\u8a08\u6578",
    agg_sum: "\u52a0\u7e3d",
    agg_avg: "\u5e73\u5747",
    agg_min: "\u6700\u5c0f",
    agg_max: "\u6700\u5927",
    pie_chart: "\u5713\u9905\u5716",
    target_format: "\u76ee\u6a19\u683c\u5f0f",
    bom: "BOM",
    flatten_json: "\u5c55\u958b JSON",
    unflatten_json: "\u9084\u539f JSON",
    template: "\u7bc4\u672c",
    test_text: "\u6e2c\u8a66\u6587\u5b57",
    replace_preview: "\u53d6\u4ee3\u9810\u89bd",
    matches: "\u7b26\u5408\u9805\u76ee",
    details: "\u8a73\u7d30\u5167\u5bb9",
    paste_json: "\u8cbc\u4e0a JSON",
    search: "\u641c\u5c0b",
    pretty: "\u6392\u7248",
    minify: "\u58d3\u7e2e",
    add_field: "\u65b0\u589e\u6b04\u4f4d",
    field_name: "\u6b04\u4f4d\u540d\u7a31",
    field_type: "\u985e\u578b",
    params: "\u53c3\u6578",
    remove: "\u79fb\u9664",
    null_ratio: "\u7a7a\u503c\u6bd4\u4f8b",
    generate: "\u7522\u751f",
    count_rows: "\u7b46\u6578",
    type_zh_name: "\u4e2d\u6587\u59d3\u540d",
    type_en_name: "\u82f1\u6587\u59d3\u540d",
    type_email: "\u96fb\u5b50\u90f5\u4ef6",
    type_mobile: "\u53f0\u7063\u624b\u6a5f",
    type_integer: "\u6574\u6578",
    type_decimal: "\u5c0f\u6578",
    type_date: "\u65e5\u671f",
    type_boolean: "\u5e03\u6797",
    type_uuid: "UUID",
    type_pick: "\u81ea\u8a02\u6e05\u55ae",
    type_sequence: "\u5e8f\u865f",
    vendor_sheet_missing: "SheetJS \u5957\u4ef6\u672a\u8f09\u5165",
    vendor_chart_missing: "Chart.js \u5957\u4ef6\u672a\u8f09\u5165"
    ,
    load_two_tables: "\u8acb\u5148\u8f09\u5165\u5169\u4efd\u8cc7\u6599",
    comparing: "\u6bd4\u5c0d\u4e2d",
    cleaning: "\u6e05\u7406\u4e2d",
    generating: "\u7522\u751f\u4e2d",
    select_two_columns: "\u8acb\u9078\u64c7\u81f3\u5c11 2 \u500b\u6b04\u4f4d",
    undo_unavailable: "\u76ee\u524d\u7121\u6cd5\u5fa9\u539f",
    select_group_columns: "\u8acb\u9078\u64c7\u5206\u7d44\u6b04",
    table_only_three_dims: "3 \u500b\u7dad\u5ea6\u50c5\u986f\u793a\u8868\u683c",
    chart_top_50: "\u5716\u8868\u50c5\u986f\u793a\u524d 50 \u7d44\u8207\u5176\u4ed6",
    other: "\u5176\u4ed6",
    limit_exceeded_merge: "\u8d85\u904e\u4e0a\u9650\uff1a30 \u500b\u6a94\u6848 / 500000 \u5217",
    strict_mismatch: "\u56b4\u683c\u6a21\u5f0f\u6b04\u4f4d\u4e0d\u4e00\u81f4",
    json_too_large: "JSON \u6a94\u6848\u8d85\u904e 20 MB",
    regex_too_complex: "\u689d\u4ef6\u5f0f\u904e\u65bc\u8907\u96dc\uff0c\u5df2\u505c\u6b62",
    tool_format: "\u6587\u5b57\u683c\u5f0f\u5316",
    tool_palette: "\u8272\u5f69\u8abf\u8272\u76e4",
    fmt_input: "\u8f38\u5165\u5167\u5bb9",
    fmt_hint: "# \u6a19\u984c\u3001- \u6e05\u55ae\u3001**\u7c97\u9ad4**\u3001> \u5f15\u8a00\uff1b\u8868\u683c\u53ef\u5f9e Excel \u76f4\u63a5\u8cbc\u4e0a",
    fmt_copy_rich: "\u8907\u88fd\u683c\u5f0f\u5316\u5167\u5bb9",
    fmt_copy_html: "\u8907\u88fd HTML",
    fmt_font: "\u5b57\u578b",
    fmt_size: "\u5b57\u7d1a",
    fmt_color: "\u4e3b\u8272",
    fmt_table_style: "\u8868\u683c\u6a23\u5f0f",
    fmt_striped: "\u689d\u7d0b",
    fmt_grid: "\u6846\u7dda",
    fmt_plain: "\u7c21\u6f54",
    fmt_show_src: "HTML \u539f\u59cb\u78bc",
    fmt_h1: "\u5927\u6a19",
    fmt_h2: "\u4e2d\u6a19",
    fmt_h3: "\u5c0f\u6a19",
    fmt_bold: "\u7c97\u9ad4",
    fmt_italic: "\u659c\u9ad4",
    fmt_list: "\u6e05\u55ae",
    fmt_olist: "\u7de8\u865f",
    fmt_quote: "\u5f15\u8a00",
    fmt_link: "\u9023\u7d50",
    fmt_table: "\u8868\u683c",
    fmt_hr: "\u5206\u9694\u7dda",
    fmt_help: "\u8a9e\u6cd5\u8aaa\u660e",
    fmt_copied_rich: "\u5df2\u8907\u88fd\uff0c\u53ef\u76f4\u63a5\u8cbc\u5230 Outlook",
    fmt_copied_html: "\u5df2\u8907\u88fd HTML \u539f\u59cb\u78bc",
    copy_failed: "\u8907\u88fd\u5931\u6557",
    size_small: "\u5c0f",
    size_medium: "\u4e2d",
    size_large: "\u5927",
    pal_base: "\u57fa\u6e96\u8272",
    pal_random: "\u96a8\u6a5f\u914d\u8272",
    pal_schemes: "\u914d\u8272\u65b9\u6848",
    pal_mono: "\u55ae\u8272\u6df1\u6dfa",
    pal_analogous: "\u9130\u8fd1\u8272",
    pal_complementary: "\u4e92\u88dc\u8272",
    pal_split: "\u5206\u88c2\u4e92\u88dc",
    pal_triadic: "\u4e09\u89d2\u914d\u8272",
    pal_tetradic: "\u77e9\u5f62\u914d\u8272",
    pal_scale: "\u6df1\u6dfa\u968e",
    pal_presets: "\u7cbe\u9078\u8272\u76e4",
    pal_copied: "\u5df2\u8907\u88fd",
    pal_copy_all: "\u8907\u88fd\u5168\u90e8",
    hd_start: "\u8d77\u59cb\u5217",
    hd_rows: "\u8868\u982d\u5217\u6578",
    hd_confirm: "\u78ba\u8a8d\u4f7f\u7528",
    hd_summary: "\u5075\u6e2c\u7d50\u679c\uff1a\u8df3\u904e {skip} \u5217\u96dc\u8a0a\uff0c\u8868\u982d {rows} \u5217",
    hd_badge: "\u8df3\u904e {skip} \u5217\uff0c\u8868\u982d {rows} \u5217",
    mock_param_int: "\u6700\u5c0f,\u6700\u5927\uff08\u9810\u8a2d 0,100\uff09",
    mock_param_dec: "\u6700\u5c0f,\u6700\u5927,\u5c0f\u6578\u4f4d\uff08\u9810\u8a2d 0,100,2\uff09",
    mock_param_date: "\u8d77\u65e5,\u8a16\u65e5\uff08\u9810\u8a2d 2024/01/01,2024/12/31\uff09",
    mock_param_pick: "\u9078\u98051,\u9078\u98052,\u9078\u98053\uff08\u9017\u865f\u5206\u9694\uff09",
    mock_param_seq: "\u8d77\u59cb\u503c,\u6b65\u9032\uff08\u9810\u8a2d 1,1\uff09",
    mock_param_none: "\u6b64\u578b\u5225\u7121\u53c3\u6578"
  };

  function t(key) {
    return App.I18N[key] || key;
  }

  App.State = {
    current: null,
    set: function (table) {
      App.State.current = normalizeTable(table);
      document.dispatchEvent(new CustomEvent("statechange", { detail: App.State.current }));
    }
  };

  function normalizeTable(table) {
    table = table || {};
    var headers = (table.headers || []).map(function (h, i) {
      var name = String(h == null ? "" : h).trim();
      return name || "Column " + (i + 1);
    });
    var rows = (table.rows || []).map(function (row) {
      var out = new Array(headers.length);
      for (var i = 0; i < headers.length; i++) {
        var value = row ? row[i] : null;
        out[i] = value == null || value === "" ? null : String(value);
      }
      return out;
    });
    return {
      headers: dedupeHeaders(headers),
      rows: rows,
      meta: table.meta || { sourceName: "", sheetName: "", totalRows: rows.length }
    };
  }

  function dedupeHeaders(headers) {
    var seen = {};
    return headers.map(function (h, i) {
      var base = String(h || "Column " + (i + 1)).trim() || "Column " + (i + 1);
      var key = base;
      if (seen[key]) {
        seen[key] += 1;
        return base + "_" + seen[key];
      }
      seen[key] = 1;
      return key;
    });
  }

  App.Theme = (function () {
    var key = "toolbox-theme";
    function get() {
      return document.documentElement.getAttribute("data-theme") || "dark";
    }
    function set(name) {
      var next = name === "light" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem(key, next); } catch (err) {}
      updateButton();
      document.dispatchEvent(new CustomEvent("themechange", { detail: { theme: next } }));
    }
    function toggle() {
      set(get() === "dark" ? "light" : "dark");
    }
    function updateButton() {
      var btn = document.getElementById("theme-toggle");
      if (!btn) return;
      var dark = get() === "dark";
      btn.setAttribute("aria-label", dark ? t("theme_light") : t("theme_dark"));
      btn.innerHTML = dark ? iconSun() : iconMoon();
    }
    function onChange(callback) {
      document.addEventListener("themechange", function (ev) { callback(ev.detail.theme); });
    }
    return { get: get, set: set, toggle: toggle, updateButton: updateButton, onChange: onChange };
  })();

  function iconSun() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path></svg>';
  }

  function iconMoon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"></path></svg>';
  }

