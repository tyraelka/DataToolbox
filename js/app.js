"use strict";

function boot() {
  document.getElementById("app-title").textContent = t("app_title");
  document.getElementById("app-subtitle").textContent = t("app_subtitle");
  document.getElementById("theme-toggle").addEventListener("click", App.Theme.toggle);
  App.Theme.updateButton();
  App.Router.register({ hash: "#health", group: "analysis", titleKey: "tool_health", module: App.Health });
  App.Router.register({ hash: "#diff", group: "analysis", titleKey: "tool_diff", module: App.Diff });
  App.Router.register({ hash: "#pivot", group: "analysis", titleKey: "tool_pivot", module: App.Pivot });
  App.Router.register({ hash: "#cleaner", group: "process", titleKey: "tool_cleaner", module: App.Cleaner });
  App.Router.register({ hash: "#column", group: "process", titleKey: "tool_column", module: App.ColumnTool });
  App.Router.register({ hash: "#merger", group: "process", titleKey: "tool_merger", module: App.Merger });
  App.Router.register({ hash: "#converter", group: "utility", titleKey: "tool_converter", module: App.Converter });
  App.Router.register({ hash: "#regex", group: "utility", titleKey: "tool_regex", module: App.RegexTester });
  App.Router.register({ hash: "#json", group: "utility", titleKey: "tool_json", module: App.JsonViewer });
  App.Router.register({ hash: "#mock", group: "utility", titleKey: "tool_mock", module: App.MockGen });
  App.Router.register({ hash: "#format", group: "utility", titleKey: "tool_format", module: App.TextFormatter });
  App.Router.register({ hash: "#palette", group: "utility", titleKey: "tool_palette", module: App.Palette });
  App.Router.init();
  if (typeof XLSX === "undefined") App.UI.toast(t("vendor_sheet_missing"), "error", 10000);
  if (typeof Chart === "undefined") App.UI.toast(t("vendor_chart_missing"), "error", 10000);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
