"use strict";
  App.Health = (function () {
    var table = null;
    function init(container) {
      container.innerHTML = '<div class="tool-grid"><div data-source></div><div><div class="panel"><h2>' + t("tool_health") + '</h2><div id="health-stats" class="stats"></div><div id="health-chart" class="chart-box small"><canvas id="health-null-chart"></canvas></div><div id="health-table"></div></div></div></div>';
      container.querySelector("[data-source]").appendChild(sourcePanel(function (next) {
        table = next;
        render(container);
      }));
      if (App.State.current) {
        table = cloneTable(App.State.current);
        render(container);
      }
    }
    function render(container) {
      if (!table) return;
      App.State.set(table);
      var profile = profileTable(table);
      container.querySelector("#health-stats").innerHTML =
        stat(t("rows"), table.rows.length) + stat(t("cols"), table.headers.length) + stat(t("complete_rate"), profile.complete + "%") + stat(t("duplicate_rows"), profile.duplicates);
      App.Charts.bar("health-null-chart", table.headers, profile.nullRates, { label: t("null_rate") });
      App.UI.renderTable(container.querySelector("#health-table"), table.headers, table.rows, PREVIEW_CAP);
    }
    function profileTable(table) {
      var total = table.rows.length * Math.max(1, table.headers.length);
      var empty = 0;
      var nullRates = table.headers.map(function (_, c) {
        var n = 0;
        table.rows.forEach(function (row) { if (isEmpty(row[c])) n++; });
        empty += n;
        return table.rows.length ? Math.round(n / table.rows.length * 1000) / 10 : 0;
      });
      var seen = {};
      var dup = 0;
      table.rows.forEach(function (row) {
        var key = JSON.stringify(row);
        if (seen[key]) dup++; else seen[key] = true;
      });
      return { nullRates: nullRates, complete: total ? Math.round((1 - empty / total) * 1000) / 10 : 100, duplicates: dup };
    }
    return { init: init, destroy: function () {} };
  })();

  function stat(label, value) {
    return '<div class="stat-card"><span class="stat-num">' + App.UI.escapeHtml(value) + '</span><span class="muted">' + App.UI.escapeHtml(label) + "</span></div>";
  }

  function isEmpty(value) {
    return value == null || String(value).trim() === "";
  }

  App.Diff = (function () {
    var oldTable = null;
    var newTable = null;
    var result = null;
    function init(container) {
      container.innerHTML = '<div class="two-col"><div class="panel"><h2>' + t("old_data") + '</h2><div id="diff-old"></div></div><div class="panel"><h2>' + t("new_data") + '</h2><div id="diff-new"></div></div></div><div class="panel"><h2>' + t("tool_diff") + '</h2><div class="field-row"><label>' + t("key_columns") + '</label><select id="diff-keys" multiple></select></div><div class="toolbar"><button class="btn primary" id="run-diff">' + t("execute") + '</button></div><div id="diff-summary" class="stats"></div><div id="diff-output"></div></div>';
      App.UI.createUploader({ container: container.querySelector("#diff-old"), onParsed: function (table) { oldTable = table; updateKeys(container); } });
      App.UI.createUploader({ container: container.querySelector("#diff-new"), onParsed: function (table) { newTable = table; updateKeys(container); } });
      container.querySelector("#run-diff").addEventListener("click", function () { run(container); });
    }
    function updateKeys(container) {
      var select = container.querySelector("#diff-keys");
      select.innerHTML = "";
      if (!oldTable || !newTable) return;
      newTable.headers.filter(function (h) { return oldTable.headers.indexOf(h) >= 0; }).forEach(function (h) {
        var opt = document.createElement("option");
        opt.value = h;
        opt.textContent = h;
        select.appendChild(opt);
      });
    }
    async function run(container) {
      if (!oldTable || !newTable) return App.UI.toast(t("load_two_tables"), "warning");
      var keys = Array.prototype.slice.call(container.querySelector("#diff-keys").selectedOptions).map(function (o) { return o.value; });
      App.UI.showLoading(t("comparing"), 0);
      result = await diffTables(oldTable, newTable, keys, function (p) { App.UI.setLoadingText(t("comparing"), p); });
      App.UI.hideLoading();
      container.querySelector("#diff-summary").innerHTML = stat(t("added"), result.summary.added) + stat(t("deleted"), result.summary.deleted) + stat(t("modified"), result.summary.modified) + stat(t("unchanged"), result.summary.unchanged);
      renderDiffOutput(container.querySelector("#diff-output"), result);
    }
    return { init: init, destroy: function () {} };
  })();

  async function diffTables(oldTable, newTable, keys, onProgress) {
    var common = newTable.headers.filter(function (h) { return oldTable.headers.indexOf(h) >= 0; });
    var oldIdx = indexMap(oldTable.headers);
    var newIdx = indexMap(newTable.headers);
    var oldMap = new Map();
    var useKeys = keys && keys.length;
    function makeKey(row, idx) {
      return (useKeys ? keys : common).map(function (h) { return String(row[idx[h]] == null ? "" : row[idx[h]]); }).join("\u0001");
    }
    for (var i = 0; i < oldTable.rows.length; i += BATCH) {
      oldTable.rows.slice(i, i + BATCH).forEach(function (row, off) {
        var key = makeKey(row, oldIdx);
        if (!oldMap.has(key)) oldMap.set(key, []);
        oldMap.get(key).push(i + off);
      });
      if (onProgress) onProgress(Math.round(i / Math.max(1, oldTable.rows.length) * 35));
      await tick();
    }
    var records = [];
    var summary = { added: 0, deleted: 0, modified: 0, unchanged: 0 };
    for (var n = 0; n < newTable.rows.length; n += BATCH) {
      newTable.rows.slice(n, n + BATCH).forEach(function (row) {
        var key = makeKey(row, newIdx);
        var bucket = oldMap.get(key);
        if (!bucket || !bucket.length) {
          summary.added++;
          records.push({ status: "added", key: key, newRow: row, changes: [] });
          return;
        }
        var oldRow = oldTable.rows[bucket.shift()];
        var changes = [];
        common.forEach(function (h) {
          if (String(oldRow[oldIdx[h]] == null ? "" : oldRow[oldIdx[h]]) !== String(row[newIdx[h]] == null ? "" : row[newIdx[h]])) {
            changes.push({ column: h, oldVal: oldRow[oldIdx[h]], newVal: row[newIdx[h]] });
          }
        });
        if (changes.length) { summary.modified++; records.push({ status: "modified", key: key, oldRow: oldRow, newRow: row, changes: changes }); }
        else { summary.unchanged++; records.push({ status: "unchanged", key: key, oldRow: oldRow, newRow: row, changes: [] }); }
      });
      if (onProgress) onProgress(35 + Math.round(n / Math.max(1, newTable.rows.length) * 55));
      await tick();
    }
    oldMap.forEach(function (bucket, key) {
      bucket.forEach(function (idx) {
        summary.deleted++;
        records.push({ status: "deleted", key: key, oldRow: oldTable.rows[idx], changes: [] });
      });
    });
    if (onProgress) onProgress(100);
    return { common: common, records: records, summary: summary, oldIdx: oldIdx, newIdx: newIdx };
  }

  function renderDiffOutput(el, result) {
    var headers = ["status", "key"].concat(result.common);
    var rows = result.records.slice(0, RENDER_CAP).map(function (rec) {
      return [rec.status, rec.key.replace(/\u0001/g, " | ")].concat(result.common.map(function (h) {
        var change = rec.changes.find(function (c) { return c.column === h; });
        if (change) return String(change.oldVal == null ? "" : change.oldVal) + " -> " + String(change.newVal == null ? "" : change.newVal);
        if (rec.status === "deleted") return rec.oldRow[result.oldIdx[h]];
        return rec.newRow ? rec.newRow[result.newIdx[h]] : "";
      }));
    });
    App.UI.renderTable(el, headers, rows, RENDER_CAP);
  }

  function indexMap(headers) {
    var out = {};
    headers.forEach(function (h, i) { out[h] = i; });
    return out;
  }

