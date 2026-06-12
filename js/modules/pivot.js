"use strict";
  App.Pivot = (function () {
    var table = null;
    var result = null;
    function init(container) {
      container.innerHTML = '<div class="tool-grid"><div data-source></div><div class="panel"><h2>' + t("tool_pivot") + '</h2><div class="field-row"><label>' + t("groups") + '</label><select id="pivot-groups" multiple></select><label>' + t("value_column") + '</label><select id="pivot-value"></select><label>' + t("aggregation") + '</label><select id="pivot-agg"><option value="count">' + t("agg_count") + '</option><option value="sum">' + t("agg_sum") + '</option><option value="avg">' + t("agg_avg") + '</option><option value="min">' + t("agg_min") + '</option><option value="max">' + t("agg_max") + '</option></select><label><input type="checkbox" id="pivot-pie"> ' + t("pie_chart") + '</label><button class="btn primary" id="pivot-run">' + t("execute") + '</button></div><div class="chart-box"><canvas id="pivot-chart"></canvas></div><div id="pivot-output"></div></div></div>';
      container.querySelector("[data-source]").appendChild(sourcePanel(function (next) { table = next; update(container); }));
      container.querySelector("#pivot-run").addEventListener("click", function () { run(container); });
      if (App.State.current) { table = cloneTable(App.State.current); update(container); }
    }
    function update(container) {
      var opts = columnOptions(table);
      container.querySelector("#pivot-groups").innerHTML = opts;
      container.querySelector("#pivot-value").innerHTML = opts;
    }
    /* group columns under <optgroup> when the table carries multi-row
       header info; option values stay the flat composed names */
    function columnOptions(table) {
      var esc = App.UI.escapeHtml;
      var colGroups = table.meta && table.meta.colGroups;
      var headers = table.headers;
      var usable = colGroups && colGroups.length === headers.length && colGroups.some(function (g) { return g; });
      if (!usable) {
        return headers.map(function (h) { return '<option value="' + esc(h) + '">' + esc(h) + "</option>"; }).join("");
      }
      var html = "";
      var open = null;
      headers.forEach(function (h, i) {
        var group = colGroups[i] || null;
        if (group !== open) {
          if (open != null) html += "</optgroup>";
          if (group != null) html += '<optgroup label="' + esc(group) + '">';
          open = group;
        }
        var label = group && h.indexOf(group + "_") === 0 ? h.slice(group.length + 1) : h;
        html += '<option value="' + esc(h) + '">' + esc(label) + "</option>";
      });
      if (open != null) html += "</optgroup>";
      return html;
    }
    function run(container) {
      if (!table) return App.UI.toast(t("no_data"), "warning");
      var groups = Array.prototype.slice.call(container.querySelector("#pivot-groups").selectedOptions).map(function (o) { return o.value; }).slice(0, 3);
      if (!groups.length) return App.UI.toast(t("select_group_columns"), "warning");
      var value = container.querySelector("#pivot-value").value;
      var agg = container.querySelector("#pivot-agg").value;
      result = pivotTable(table, groups, value, agg);
      App.UI.renderTable(container.querySelector("#pivot-output"), result.headers, result.rows, RENDER_CAP);
      renderPivotChart(container, result, groups);
      sendExportBar(container.querySelector("#pivot-output"), function () { return result; });
    }
    return { init: init, destroy: function () {} };
  })();

  function pivotTable(table, groups, value, agg) {
    var idx = indexMap(table.headers);
    var map = new Map();
    table.rows.forEach(function (row) {
      var keyParts = groups.map(function (h) { return row[idx[h]] || ""; });
      var key = keyParts.join("\u0001");
      if (!map.has(key)) map.set(key, { groups: keyParts, values: [], count: 0, ignored: 0 });
      var slot = map.get(key);
      slot.count++;
      var n = Number(row[idx[value]]);
      if (agg === "count") slot.values.push(1);
      else if (isFinite(n)) slot.values.push(n);
      else slot.ignored++;
    });
    var rows = [];
    map.forEach(function (slot) {
      var val = aggregate(slot.values, agg);
      rows.push(slot.groups.concat([val, slot.ignored]));
    });
    rows.sort(function (a, b) { return String(a[0]).localeCompare(String(b[0])); });
    return { headers: groups.concat([agg + "_" + value, "ignored"]), rows: rows, meta: { sourceName: "pivot", totalRows: rows.length } };
  }

  function aggregate(values, agg) {
    if (agg === "count") return values.length;
    if (!values.length) return null;
    if (agg === "sum") return round(values.reduce(function (a, b) { return a + b; }, 0));
    if (agg === "avg") return round(values.reduce(function (a, b) { return a + b; }, 0) / values.length);
    if (agg === "min") return Math.min.apply(Math, values);
    if (agg === "max") return Math.max.apply(Math, values);
    return null;
  }

  function round(n) {
    return Math.round(n * 1000000) / 1000000;
  }

  function renderPivotChart(container, result, groups) {
    var chartRows = result.rows.slice().sort(function (a, b) { return Number(b[groups.length]) - Number(a[groups.length]); });
    if (groups.length > 2) return App.UI.toast(t("table_only_three_dims"), "warning");
    var labels = chartRows.slice(0, 50).map(function (row) { return row.slice(0, groups.length).join(" / "); });
    var values = chartRows.slice(0, 50).map(function (row) { return Number(row[groups.length]) || 0; });
    if (chartRows.length > 50) {
      labels.push(t("other"));
      values.push(chartRows.slice(50).reduce(function (s, row) { return s + (Number(row[groups.length]) || 0); }, 0));
      App.UI.toast(t("chart_top_50"), "warning");
    }
    if (container.querySelector("#pivot-pie").checked && groups.length === 1 && labels.length <= 8) App.Charts.pie("pivot-chart", labels, values);
    else App.Charts.bar("pivot-chart", labels, values, {});
  }

