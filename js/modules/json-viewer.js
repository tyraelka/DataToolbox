"use strict";
  App.JsonViewer = (function () {
    var data = null;
    function init(container) {
      container.innerHTML = '<div class="panel"><h2>' + t("tool_json") + '</h2><div class="toolbar"><input type="file" id="json-file" accept=".json"><button class="btn" id="json-parse">' + t("execute") + '</button><button class="btn" id="json-pretty">' + t("pretty") + '</button><button class="btn" id="json-min">' + t("minify") + '</button><input type="search" id="json-search" placeholder="' + t("search") + '"></div><textarea id="json-text" maxlength="20971520" placeholder="' + t("paste_json") + '"></textarea><div id="json-error" class="muted"></div><div id="json-tree" class="json-tree"></div></div>';
      container.querySelector("#json-file").addEventListener("change", function (ev) { loadFile(ev.target.files[0], container); });
      container.querySelector("#json-parse").addEventListener("click", function () { parse(container); });
      container.querySelector("#json-pretty").addEventListener("click", function () { if (data != null) container.querySelector("#json-text").value = JSON.stringify(data, null, 2); });
      container.querySelector("#json-min").addEventListener("click", function () { if (data != null) container.querySelector("#json-text").value = JSON.stringify(data); });
      container.querySelector("#json-search").addEventListener("input", function () { renderTree(container, container.querySelector("#json-search").value); });
    }
    function loadFile(file, container) {
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) return App.UI.toast(t("json_too_large"), "error");
      var reader = new FileReader();
      reader.onload = function (ev) { container.querySelector("#json-text").value = ev.target.result; parse(container); };
      reader.readAsText(file, "utf-8");
    }
    function parse(container) {
      try {
        data = JSON.parse(container.querySelector("#json-text").value);
        container.querySelector("#json-error").textContent = "";
        renderTree(container, "");
      } catch (err) {
        container.querySelector("#json-error").textContent = jsonErrorContext(container.querySelector("#json-text").value, err);
      }
    }
    function renderTree(container, query) {
      container.querySelector("#json-tree").innerHTML = renderJsonNode(data, "$", query || "", 0);
    }
    return { init: init, destroy: function () {} };
  })();

  function renderJsonNode(value, path, query, depth) {
    if (depth > 3) return '<div class="tree-node"><span class="tree-key">' + App.UI.escapeHtml(path) + '</span>: ...</div>';
    var text = typeof value === "string" ? value : JSON.stringify(value);
    var hit = query && String(path + " " + text).toLowerCase().indexOf(query.toLowerCase()) >= 0;
    var cls = hit ? " cell-changed" : "";
    if (value && typeof value === "object") {
      var keys = Array.isArray(value) ? value.map(function (_, i) { return i; }) : Object.keys(value);
      var limit = Array.isArray(value) ? Math.min(keys.length, 100) : keys.length;
      var html = '<div class="tree-node' + cls + '"><span class="tree-key">' + App.UI.escapeHtml(path) + "</span>";
      for (var i = 0; i < limit; i++) {
        var key = keys[i];
        html += renderJsonNode(value[key], path + (Array.isArray(value) ? "[" + key + "]" : "." + key), query, depth + 1);
      }
      if (keys.length > limit) html += '<div class="muted">load more not shown: ' + (keys.length - limit) + "</div>";
      return html + "</div>";
    }
    return '<div class="tree-node' + cls + '"><span class="tree-key">' + App.UI.escapeHtml(path) + '</span>: <span class="tree-value">' + App.UI.escapeHtml(String(value)) + "</span></div>";
  }

  function jsonErrorContext(text, err) {
    var posMatch = /position (\d+)/i.exec(err.message);
    if (!posMatch) return err.message;
    var pos = Number(posMatch[1]);
    var before = text.slice(0, pos);
    var line = before.split(/\r\n|\r|\n/).length;
    var col = before.length - before.lastIndexOf("\n");
    return err.message + " at line " + line + ", column " + col + "\n" + text.slice(Math.max(0, pos - 60), pos + 60);
  }

