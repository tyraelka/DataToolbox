"use strict";
  App.Merger = (function () {
    var tables = [];
    var result = null;
    function init(container) {
      container.innerHTML = '<div class="panel"><h2>' + t("tool_merger") + '</h2><div id="merge-upload"></div><div class="field-row"><label>' + t("mode") + '</label><select id="merge-mode"><option value="union">' + t("union") + '</option><option value="intersection">' + t("intersection") + '</option><option value="strict">' + t("strict") + '</option></select><label><input type="checkbox" id="merge-source"> ' + t("source_columns") + '</label><button class="btn primary" id="merge-run">' + t("execute") + '</button></div><ul class="file-list" id="merge-files"></ul><div id="merge-output"></div></div>';
      App.UI.createUploader({ container: container.querySelector("#merge-upload"), multiple: true, onParsed: function (items) { tables = tables.concat(items); renderList(container); } });
      container.querySelector("#merge-run").addEventListener("click", function () { run(container); });
    }
    function renderList(container) {
      var total = tables.reduce(function (s, t) { return s + t.rows.length; }, 0);
      if (tables.length > 30 || total > 500000) {
        App.UI.toast(t("limit_exceeded_merge"), "error", 7000);
        tables = tables.slice(0, 30);
      }
      container.querySelector("#merge-files").innerHTML = tables.map(function (table, i) {
        return '<li class="file-item"><span>' + App.UI.escapeHtml(describeTable(table)) + '</span><button class="btn small" data-remove="' + i + '">' + t("remove") + '</button></li>';
      }).join("");
      container.querySelectorAll("[data-remove]").forEach(function (btn) {
        btn.addEventListener("click", function () { tables.splice(Number(btn.dataset.remove), 1); renderList(container); });
      });
    }
    async function run(container) {
      if (!tables.length) return App.UI.toast(t("no_data"), "warning");
      var mode = container.querySelector("#merge-mode").value;
      var source = container.querySelector("#merge-source").checked;
      try {
        result = mergeTables(tables, mode, source);
      } catch (err) {
        return App.UI.toast(err.message, "error", 8000);
      }
      App.State.set(result);
      App.UI.renderTable(container.querySelector("#merge-output"), result.headers, result.rows, RENDER_CAP);
      sendExportBar(container.querySelector("#merge-output"), function () { return result; });
    }
    return { init: init, destroy: function () {} };
  })();

  function mergeTables(tables, mode, source) {
    var headers;
    if (mode === "strict") {
      headers = tables[0].headers.slice();
      tables.slice(1).forEach(function (table) {
        if (JSON.stringify(table.headers) !== JSON.stringify(headers)) {
          throw new Error(t("strict_mismatch") + " - " + (table.meta.sourceName || "file") + ": " + diffHeaderNames(headers, table.headers).join(", "));
        }
      });
    } else if (mode === "intersection") {
      headers = tables[0].headers.filter(function (h) { return tables.every(function (t) { return t.headers.indexOf(h) >= 0; }); });
    } else {
      headers = [];
      tables.forEach(function (table) { table.headers.forEach(function (h) { if (headers.indexOf(h) < 0) headers.push(h); }); });
    }
    var outHeaders = headers.slice();
    if (source) outHeaders = outHeaders.concat(["_source_file", "_source_sheet"]);
    var outRows = [];
    tables.forEach(function (table) {
      var idx = indexMap(table.headers);
      table.rows.forEach(function (row) {
        var next = headers.map(function (h) { return idx[h] == null ? null : row[idx[h]]; });
        if (source) next.push(table.meta.sourceName || "", table.meta.sheetName || "");
        outRows.push(next);
      });
    });
    return { headers: outHeaders, rows: outRows, meta: { sourceName: "merged", totalRows: outRows.length } };
  }

  function diffHeaderNames(a, b) {
    var setA = new Set(a);
    var setB = new Set(b);
    return a.filter(function (h) { return !setB.has(h); }).concat(b.filter(function (h) { return !setA.has(h); }));
  }

