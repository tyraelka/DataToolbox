"use strict";
  App.ColumnTool = (function () {
    var table = null;
    var undo = null;
    function init(container) {
      container.innerHTML = '<div class="tool-grid"><div data-source></div><div class="panel"><h2>' + t("tool_column") + '</h2><div class="field-row"><label>' + t("column") + '</label><select id="col-main"></select></div><h3>' + t("split") + '</h3><div class="field-row"><input id="split-delim" type="text" placeholder="' + t("delimiter") + '"><input id="split-count" type="number" value="2" min="2"><button class="btn" id="split-run">' + t("split") + '</button></div><h3>' + t("regex_extract") + '</h3><div class="field-row"><input id="regex-pattern" type="text" placeholder="' + t("pattern") + '"><input id="regex-name" type="text" placeholder="' + t("new_column") + '"><button class="btn" id="extract-run">' + t("regex_extract") + '</button></div><h3>' + t("merge_columns") + '</h3><div class="field-row"><select id="merge-cols" multiple></select><input id="merge-joiner" type="text" placeholder="' + t("joiner") + '"><input id="merge-name" type="text" placeholder="' + t("new_column") + '"><label><input type="checkbox" id="merge-remove"> ' + t("remove_source") + '</label><button class="btn" id="merge-run">' + t("merge_columns") + '</button></div><div class="toolbar"><button class="btn" id="undo-run">' + t("undo") + '</button></div><div id="column-output"></div></div></div>';
      container.querySelector("[data-source]").appendChild(sourcePanel(function (next) { table = next; undo = null; refresh(container); }));
      ["split-run", "extract-run", "merge-run", "undo-run"].forEach(function (id) {
        container.querySelector("#" + id).addEventListener("click", function () { action(container, id); });
      });
      if (App.State.current) { table = cloneTable(App.State.current); refresh(container); }
    }
    function snapshot() {
      if (!table) return;
      if (table.headers.length * table.rows.length <= 100000) undo = cloneTable(table);
      else undo = null;
    }
    function refresh(container) {
      if (!table) return;
      var opts = table.headers.map(function (h) { return '<option value="' + App.UI.escapeHtml(h) + '">' + App.UI.escapeHtml(h) + "</option>"; }).join("");
      container.querySelector("#col-main").innerHTML = opts;
      container.querySelector("#merge-cols").innerHTML = opts;
      App.State.set(table);
      App.UI.renderTable(container.querySelector("#column-output"), table.headers, table.rows, RENDER_CAP);
    }
    function action(container, id) {
      if (!table) return App.UI.toast(t("no_data"), "warning");
      if (id === "undo-run") {
        if (!undo) return App.UI.toast(t("undo_unavailable"), "warning");
        table = cloneTable(undo);
        undo = null;
        refresh(container);
        return;
      }
      snapshot();
      var col = container.querySelector("#col-main").value;
      var idx = table.headers.indexOf(col);
      if (id === "split-run") {
        var delimiter = container.querySelector("#split-delim").value;
        var count = Math.max(2, Number(container.querySelector("#split-count").value) || 2);
        for (var i = 0; i < count; i++) table.headers.splice(idx + 1 + i, 0, col + "_" + (i + 1));
        table.rows.forEach(function (row) {
          var parts = delimiter ? String(row[idx] || "").split(delimiter) : [String(row[idx] || "")];
          for (var i = 0; i < count; i++) row.splice(idx + 1 + i, 0, parts[i] || "");
        });
      } else if (id === "extract-run") {
        var pattern = container.querySelector("#regex-pattern").value;
        var compiled = App.RegexUtil.safeCompile(pattern, "");
        if (!compiled.ok || compiled.warning) return App.UI.toast(compiled.error || compiled.warning, "warning");
        var name = container.querySelector("#regex-name").value || col + "_extract";
        table.headers.push(name);
        table.rows.forEach(function (row) {
          var m = compiled.regex.exec(String(row[idx] || ""));
          compiled.regex.lastIndex = 0;
          row.push(m ? (m[1] || m[0]) : "");
        });
      } else if (id === "merge-run") {
        var cols = Array.prototype.slice.call(container.querySelector("#merge-cols").selectedOptions).map(function (o) { return o.value; });
        if (cols.length < 2) return App.UI.toast(t("select_two_columns"), "warning");
        var indexes = cols.map(function (h) { return table.headers.indexOf(h); });
        var joiner = container.querySelector("#merge-joiner").value;
        var newName = container.querySelector("#merge-name").value || "merged";
        table.headers.push(newName);
        table.rows.forEach(function (row) { row.push(indexes.map(function (i) { return row[i] == null ? "" : row[i]; }).join(joiner)); });
        if (container.querySelector("#merge-remove").checked) {
          indexes.sort(function (a, b) { return b - a; }).forEach(function (i) {
            table.headers.splice(i, 1);
            table.rows.forEach(function (row) { row.splice(i, 1); });
          });
        }
      }
      refresh(container);
    }
    return { init: init, destroy: function () {} };
  })();

