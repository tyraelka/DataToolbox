"use strict";
  App.Converter = (function () {
    var table = null;
    function init(container) {
      container.innerHTML = '<div class="tool-grid"><div data-source></div><div class="panel"><h2>' + t("tool_converter") + '</h2><div class="field-row"><label>' + t("target_format") + '</label><select id="conv-target"><option value="csv">CSV</option><option value="xlsx">XLSX</option><option value="json">JSON</option></select><label>' + t("delimiter") + '</label><select id="conv-delim"><option value=",">,</option><option value=";">;</option><option value="\\t">Tab</option><option value="|">|</option></select><label><input id="conv-bom" type="checkbox" checked> ' + t("bom") + '</label><button class="btn primary" id="conv-run">' + t("execute") + '</button></div><div class="toolbar"><button class="btn" id="conv-flatten">' + t("flatten_json") + '</button><button class="btn" id="conv-unflatten">' + t("unflatten_json") + '</button></div><div id="conv-output"></div></div></div>';
      container.querySelector("[data-source]").appendChild(sourcePanel(function (next) { table = next; App.UI.renderTable(container.querySelector("#conv-output"), table.headers, table.rows, PREVIEW_CAP); }));
      container.querySelector("#conv-run").addEventListener("click", function () { run(container); });
      container.querySelector("#conv-flatten").addEventListener("click", function () { if (table) { table = flattenTable(table); App.UI.renderTable(container.querySelector("#conv-output"), table.headers, table.rows, PREVIEW_CAP); } });
      container.querySelector("#conv-unflatten").addEventListener("click", function () { if (table) App.UI.exportJSON(unflattenTable(table), "unflattened.json"); });
      if (App.State.current) { table = cloneTable(App.State.current); App.UI.renderTable(container.querySelector("#conv-output"), table.headers, table.rows, PREVIEW_CAP); }
    }
    function run(container) {
      if (!table) return App.UI.toast(t("no_data"), "warning");
      var target = container.querySelector("#conv-target").value;
      if (target === "csv") App.UI.exportCSV(table, "converted.csv", { delimiter: container.querySelector("#conv-delim").value.replace("\\t", "\t"), bom: container.querySelector("#conv-bom").checked });
      if (target === "xlsx") App.UI.exportXLSX(table, "converted.xlsx");
      if (target === "json") App.UI.exportJSON(table, "converted.json");
    }
    return { init: init, destroy: function () {} };
  })();

  function flattenTable(table) {
    var objects = App.UI.tableToObjects(table);
    var flatObjects = objects.map(function (obj) { var out = {}; flattenObject(obj, "", out, 0); return out; });
    return App.Parser.parseCSV(objectsToCsv(flatObjects));
  }

  function flattenObject(value, prefix, out, depth) {
    if (depth > 5) { out[prefix] = JSON.stringify(value); return; }
    if (Array.isArray(value)) {
      value.forEach(function (item, i) { flattenObject(item, prefix + "[" + i + "]", out, depth + 1); });
    } else if (value && typeof value === "object") {
      Object.keys(value).forEach(function (key) { flattenObject(value[key], prefix ? prefix + "." + key : key, out, depth + 1); });
    } else {
      out[prefix] = value;
    }
  }

  function objectsToCsv(objects) {
    var headers = [];
    objects.forEach(function (obj) { Object.keys(obj).forEach(function (h) { if (headers.indexOf(h) < 0) headers.push(h); }); });
    return [headers.join(",")].concat(objects.map(function (obj) { return headers.map(function (h) { return obj[h] == null ? "" : String(obj[h]).replace(/"/g, '""'); }).join(","); })).join("\n");
  }

  function unflattenTable(table) {
    var objects = table.rows.map(function (row) {
      var obj = {};
      table.headers.forEach(function (h, i) { setDeep(obj, h, row[i]); });
      return obj;
    });
    return { headers: ["json"], rows: objects.map(function (o) { return [JSON.stringify(o)]; }), meta: { sourceName: "unflattened" } };
  }

  function setDeep(obj, path, value) {
    var parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
    var cur = obj;
    parts.forEach(function (part, i) {
      if (i === parts.length - 1) cur[part] = value;
      else cur = cur[part] = cur[part] || {};
    });
  }

