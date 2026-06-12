"use strict";
  App.Cleaner = (function () {
    var table = null;
    var result = null;
    function init(container) {
      container.innerHTML = '<div class="tool-grid"><div data-source></div><div class="panel"><h2>' + t("tool_cleaner") + '</h2><div class="field-stack"><label><input type="checkbox" data-op="trim" checked> ' + t("clean_trim") + '</label><label><input type="checkbox" data-op="fullwidth"> ' + t("clean_fullwidth") + '</label><label><input type="checkbox" data-op="empty"> ' + t("clean_empty") + '</label><label><input type="checkbox" data-op="dupe"> ' + t("clean_dupe") + '</label><label><input type="checkbox" data-op="numbers"> ' + t("clean_numbers") + '</label><label><input type="checkbox" data-op="dates"> ' + t("clean_dates") + '</label></div><div class="field-row"><label>' + t("date_year_last") + '</label><select id="date-mode"><option value="mdy">M/D/YYYY</option><option value="dmy">D/M/YYYY</option></select><label>' + t("output_format") + '</label><select id="date-output"><option value="/">YYYY/MM/DD</option><option value="-">YYYY-MM-DD</option></select></div><div class="toolbar"><button class="btn" id="clean-preview">' + t("preview") + '</button><button class="btn primary" id="clean-run">' + t("execute") + '</button></div><div id="clean-stats" class="stats"></div><div id="clean-output"></div></div></div>';
      container.querySelector("[data-source]").appendChild(sourcePanel(function (next) { table = next; App.UI.renderTable(container.querySelector("#clean-output"), table.headers, table.rows, PREVIEW_CAP); }));
      container.querySelector("#clean-preview").addEventListener("click", function () { preview(container); });
      container.querySelector("#clean-run").addEventListener("click", function () { run(container); });
      if (App.State.current) { table = cloneTable(App.State.current); App.UI.renderTable(container.querySelector("#clean-output"), table.headers, table.rows, PREVIEW_CAP); }
    }
    function selected(container) {
      return Array.prototype.slice.call(container.querySelectorAll("[data-op]:checked")).map(function (x) { return x.dataset.op; });
    }
    function preview(container) {
      if (!table) return App.UI.toast(t("no_data"), "warning");
      var cleaned = applyClean(cloneTable(table), selected(container), container, true).table;
      container.querySelector("#clean-output").innerHTML = App.UI.renderCompareTable(table, cleaned, { headers: cleaned.headers, maxRows: PREVIEW_CAP });
    }
    async function run(container) {
      if (!table) return App.UI.toast(t("no_data"), "warning");
      App.UI.showLoading(t("cleaning"), 0);
      result = await cleanBatched(cloneTable(table), selected(container), container);
      App.UI.hideLoading();
      App.State.set(result.table);
      container.querySelector("#clean-stats").innerHTML = result.stats.map(function (s) { return stat(s.name, s.affected + (s.unconverted ? " / " + s.unconverted : "")); }).join("");
      App.UI.renderTable(container.querySelector("#clean-output"), result.table.headers, result.table.rows, RENDER_CAP);
      sendExportBar(container.querySelector("#clean-output"), function () { return result.table; });
    }
    return { init: init, destroy: function () {} };
  })();

  async function cleanBatched(table, ops, container) {
    var stats = [];
    var out = table;
    for (var i = 0; i < ops.length; i++) {
      var step = applyClean(out, [ops[i]], container, false);
      out = step.table;
      stats = stats.concat(step.stats);
      App.UI.setLoadingText(t("cleaning") + " " + (i + 1) + " / " + ops.length, Math.round((i + 1) / ops.length * 100));
      await tick();
    }
    return { table: out, stats: stats };
  }

  function applyClean(table, ops, container) {
    var stats = [];
    ops.forEach(function (op) {
      var affected = 0;
      var unconverted = 0;
      if (op === "trim") {
        table.rows.forEach(function (row) { row.forEach(function (v, i) { var n = v == null ? null : String(v).replace(/^\s+|\s+$/g, "").replace(/^\u3000+|\u3000+$/g, ""); if (n !== v) affected++; row[i] = n; }); });
      } else if (op === "fullwidth") {
        table.rows.forEach(function (row) { row.forEach(function (v, i) { var n = toHalfWidth(v); if (n !== v) affected++; row[i] = n; }); });
      } else if (op === "empty") {
        var before = table.rows.length;
        table.rows = table.rows.filter(function (row) { return !row.every(isEmpty); });
        affected = before - table.rows.length;
      } else if (op === "dupe") {
        var seen = {};
        var keep = [];
        table.rows.forEach(function (row) {
          var key = JSON.stringify(row);
          if (seen[key]) affected++; else { seen[key] = true; keep.push(row); }
        });
        table.rows = keep;
      } else if (op === "numbers") {
        table.rows.forEach(function (row) { row.forEach(function (v, i) { var n = normalizeNumber(v); if (n !== v) affected++; row[i] = n; }); });
      } else if (op === "dates") {
        var mode = container.querySelector("#date-mode").value;
        var sep = container.querySelector("#date-output").value;
        var serialEnabled = excelSerialColumns(table);
        table.rows.forEach(function (row) {
          row.forEach(function (v, i) {
            if (isEmpty(v)) return;
            var n = parseDateValue(v, mode, sep, serialEnabled[i]);
            if (n.ok) { if (n.value !== v) affected++; row[i] = n.value; }
            else { unconverted++; }
          });
        });
      }
      stats.push({ name: op, affected: affected, unconverted: unconverted });
    });
    return { table: table, stats: stats };
  }

  function toHalfWidth(value) {
    if (value == null) return value;
    return String(value).replace(/[\uFF01-\uFF5E]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0); }).replace(/\u3000/g, " ");
  }

  function normalizeNumber(value) {
    if (value == null) return value;
    var s = toHalfWidth(value).replace(/,/g, "").trim();
    return /^[-+]?\d+(\.\d+)?$/.test(s) ? s : value;
  }

  function excelSerialColumns(table) {
    return table.headers.map(function (_, c) {
      var total = 0;
      var ok = 0;
      table.rows.forEach(function (row) {
        if (!isEmpty(row[c])) {
          total++;
          var n = Number(row[c]);
          if (n >= 25569 && n <= 80000) ok++;
        }
      });
      return total > 0 && ok / total >= 0.6;
    });
  }

  function parseDateValue(value, mode, sep, allowSerial) {
    var s = toHalfWidth(value).trim();
    var m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (m) return makeDate(+m[1], +m[2], +m[3], sep);
    var ymd = new RegExp("^(\\d{4})\\u5E74(\\d{1,2})\\u6708(\\d{1,2})\\u65E5$");
    m = s.match(ymd);
    if (m) return makeDate(+m[1], +m[2], +m[3], sep);
    if (allowSerial && /^[-+]?\d+(\.\d+)?$/.test(s)) {
      var serial = Number(s);
      if (serial >= 25569 && serial <= 80000) {
        var d = new Date(Math.round((serial - 25569) * 86400 * 1000));
        return makeDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), sep);
      }
    }
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (m) {
      var a = +m[1];
      var b = +m[2];
      var year = +m[3];
      if (a > 12) return makeDate(year, b, a, sep);
      return mode === "dmy" ? makeDate(year, b, a, sep) : makeDate(year, a, b, sep);
    }
    return { ok: false };
  }

  function makeDate(year, month, day, sep) {
    if (month < 1 || month > 12 || day < 1) return { ok: false };
    var d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) return { ok: false };
    return { ok: true, value: [year, pad2(month), pad2(day)].join(sep) };
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

