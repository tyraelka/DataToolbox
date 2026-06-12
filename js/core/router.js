"use strict";
  App.Router = (function () {
    var routes = [];
    var active = null;
    function register(route) {
      routes.push(route);
    }
    function renderNav() {
      var nav = document.getElementById("app-nav");
      var groups = { analysis: [], process: [], utility: [] };
      routes.forEach(function (route) { groups[route.group || "utility"].push(route); });
      nav.innerHTML = "";
      ["analysis", "process", "utility"].forEach(function (group) {
        var wrap = document.createElement("div");
        wrap.className = "nav-group";
        wrap.innerHTML = '<span class="nav-label">' + App.UI.escapeHtml(t("group_" + group)) + "</span>";
        groups[group].forEach(function (route) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "tab-btn";
          btn.dataset.hash = route.hash;
          btn.textContent = t(route.titleKey);
          btn.addEventListener("click", function () { show(route.hash); });
          wrap.appendChild(btn);
        });
        nav.appendChild(wrap);
      });
    }
    function show(hash) {
      if (!hash || hash === "#") hash = "#health";
      var route = routes.find(function (r) { return r.hash === hash; }) || routes[0];
      if (!route) return;
      if (active && active.module && active.module.destroy) active.module.destroy();
      active = route;
      document.querySelectorAll(".tab-btn").forEach(function (btn) { btn.classList.toggle("active", btn.dataset.hash === route.hash); });
      if (location.hash !== route.hash) history.replaceState(null, "", route.hash);
      var main = document.getElementById("app-main");
      main.innerHTML = "";
      var section = document.createElement("section");
      section.className = "tool-page";
      main.appendChild(section);
      route.module.init(section);
    }
    function init() {
      renderNav();
      window.addEventListener("hashchange", function () { show(location.hash || "#health"); });
      show(location.hash || "#health");
    }
    function sendToTool(table, hash) {
      App.State.set(table);
      show(hash);
    }
    return { register: register, init: init, show: show, sendToTool: sendToTool };
  })();

  function sourcePanel(onTable) {
    var id = "upload-" + Math.random().toString(36).slice(2);
    var html = '<div class="panel source-panel"><h2>' + t("data_source") + '</h2><div id="' + id + '"></div><div class="toolbar">';
    html += '<button class="btn" data-use-current type="button">' + t("use_current") + "</button></div>";
    html += '<p class="muted" data-info>' + t("no_data") + "</p></div>";
    var box = document.createElement("div");
    box.innerHTML = html;
    /* keep a direct reference: the panel gets moved out of box
       by the caller's appendChild before the timeout fires */
    var panel = box.firstChild;
    setTimeout(function () {
      App.UI.createUploader({
        container: panel.querySelector("#" + id),
        onParsed: function (table) {
          onTable(table);
          panel.querySelector("[data-info]").textContent = describeTable(table);
        }
      });
      panel.querySelector("[data-use-current]").addEventListener("click", function () {
        if (!App.State.current) return App.UI.toast(t("no_data"), "warning");
        onTable(cloneTable(App.State.current));
        panel.querySelector("[data-info]").textContent = describeTable(App.State.current);
      });
    });
    return panel;
  }

  function describeTable(table) {
    return (table.meta && table.meta.sourceName ? table.meta.sourceName + " - " : "") + table.rows.length.toLocaleString() + " " + t("rows") + ", " + table.headers.length + " " + t("cols");
  }

  function cloneTable(table) {
    return {
      headers: table.headers.slice(),
      rows: table.rows.map(function (r) { return r.slice(); }),
      meta: Object.assign({}, table.meta || {})
    };
  }

  function sendExportBar(container, getTable) {
    var bar = document.createElement("div");
    bar.className = "toolbar";
    bar.innerHTML = '<button class="btn" data-xlsx>' + t("export_xlsx") + '</button><button class="btn" data-csv>' + t("export_csv") + '</button><button class="btn" data-json>' + t("export_json") + '</button><select data-send><option value="">' + t("send_to_tool") + '</option></select>';
    [
      ["#health", "tool_health"],
      ["#diff", "tool_diff"],
      ["#cleaner", "tool_cleaner"],
      ["#column", "tool_column"],
      ["#merger", "tool_merger"],
      ["#pivot", "tool_pivot"],
      ["#converter", "tool_converter"],
      ["#regex", "tool_regex"],
      ["#json", "tool_json"],
      ["#mock", "tool_mock"]
    ].forEach(function (item) {
      var opt = document.createElement("option");
      opt.value = item[0];
      opt.textContent = t(item[1]);
      bar.querySelector("[data-send]").appendChild(opt);
    });
    bar.querySelector("[data-xlsx]").addEventListener("click", function () { App.UI.exportXLSX(getTable(), "data.xlsx"); });
    bar.querySelector("[data-csv]").addEventListener("click", function () { App.UI.exportCSV(getTable(), "data.csv"); });
    bar.querySelector("[data-json]").addEventListener("click", function () { App.UI.exportJSON(getTable(), "data.json"); });
    bar.querySelector("[data-send]").addEventListener("change", function (ev) {
      if (ev.target.value) App.Router.sendToTool(getTable(), ev.target.value);
    });
    container.appendChild(bar);
  }

