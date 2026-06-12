"use strict";
  App.MockGen = (function () {
    var result = null;
    function init(container) {
      container.innerHTML = '<div class="panel"><h2>' + t("tool_mock") + '</h2><div class="toolbar"><button class="btn" id="mock-add">' + t("add_field") + '</button><label>' + t("count_rows") + '</label><input id="mock-rows" type="number" value="100" min="1" max="100000"><label>' + t("null_ratio") + '</label><input id="mock-null" type="number" value="0" min="0" max="50"><button class="btn primary" id="mock-run">' + t("generate") + '</button></div><div id="mock-fields"></div><div id="mock-output"></div></div>';
      addField(container, "\u5e8f\u865f", "sequence");
      addField(container, "\u59d3\u540d", "zhName");
      addField(container, "\u65e5\u671f", "date");
      container.querySelector("#mock-add").addEventListener("click", function () { addField(container, "\u6b04\u4f4d", "pick"); });
      container.querySelector("#mock-run").addEventListener("click", function () { runMock(container); });
    }
    return { init: init, destroy: function () {} };
  })();

  var MOCK_PARAM_HINTS = {
    integer: "mock_param_int",
    decimal: "mock_param_dec",
    date: "mock_param_date",
    pick: "mock_param_pick",
    sequence: "mock_param_seq"
  };

  function addField(container, name, type) {
    var row = document.createElement("div");
    row.className = "field-row";
    row.innerHTML = '<input data-name type="text" value="' + App.UI.escapeHtml(name) + '" placeholder="' + t("field_name") + '"><select data-type><option value="zhName">' + t("type_zh_name") + '</option><option value="enName">' + t("type_en_name") + '</option><option value="email">' + t("type_email") + '</option><option value="mobile">' + t("type_mobile") + '</option><option value="integer">' + t("type_integer") + '</option><option value="decimal">' + t("type_decimal") + '</option><option value="date">' + t("type_date") + '</option><option value="boolean">' + t("type_boolean") + '</option><option value="uuid">' + t("type_uuid") + '</option><option value="pick">' + t("type_pick") + '</option><option value="sequence">' + t("type_sequence") + '</option></select><input data-param type="text"><button class="btn small danger" data-remove>' + t("remove") + '</button>';
    var select = row.querySelector("[data-type]");
    select.value = type;
    function updateParamHint() {
      var param = row.querySelector("[data-param]");
      var key = MOCK_PARAM_HINTS[select.value];
      param.disabled = !key;
      param.placeholder = key ? t(key) : t("mock_param_none");
      param.title = param.placeholder;
    }
    select.addEventListener("change", updateParamHint);
    updateParamHint();
    row.querySelector("[data-remove]").addEventListener("click", function () { row.remove(); });
    container.querySelector("#mock-fields").appendChild(row);
  }

  async function runMock(container) {
    var count = Math.min(100000, Math.max(1, Number(container.querySelector("#mock-rows").value) || 1));
    var nullRatio = Math.min(50, Math.max(0, Number(container.querySelector("#mock-null").value) || 0)) / 100;
    var fields = Array.prototype.slice.call(container.querySelectorAll("#mock-fields .field-row")).map(function (row) {
      return { name: row.querySelector("[data-name]").value || "field", type: row.querySelector("[data-type]").value, param: row.querySelector("[data-param]").value };
    });
    var rows = [];
    App.UI.showLoading(t("generating"), 0);
    for (var i = 0; i < count; i += BATCH) {
      var end = Math.min(count, i + BATCH);
      for (var r = i; r < end; r++) {
        rows.push(fields.map(function (field) { return Math.random() < nullRatio ? null : mockValue(field, r); }));
      }
      App.UI.setLoadingText(t("generating") + " " + end + " / " + count, Math.round(end / count * 100));
      await tick();
    }
    App.UI.hideLoading();
    var result = { headers: fields.map(function (f) { return f.name; }), rows: rows, meta: { sourceName: "mock", totalRows: rows.length } };
    App.State.set(result);
    App.UI.renderTable(container.querySelector("#mock-output"), result.headers, result.rows, PREVIEW_CAP);
    sendExportBar(container.querySelector("#mock-output"), function () { return result; });
  }

  function mockValue(field, index) {
    var p = field.param || "";
    if (field.type === "zhName") {
      var surnames = ["\u738b", "\u674e", "\u9673", "\u6797", "\u5f35"];
      var names = ["\u5c0f\u660e", "\u7f8e\u73b2", "\u5fd7\u5f37", "\u96c5\u5a77", "\u5bb6\u8c6a"];
      return surnames[index % surnames.length] + names[Math.floor(Math.random() * names.length)];
    }
    if (field.type === "enName") return ["Alex Chen", "Mia Lin", "Ryan Wang", "Ivy Lee"][index % 4];
    if (field.type === "email") return "user" + (index + 1) + "@example.com";
    if (field.type === "mobile") return "09" + String(10000000 + (index % 90000000));
    if (field.type === "integer") { var ip = nums(p, 0, 100); return String(randInt(ip[0], ip[1])); }
    if (field.type === "decimal") { var dp = nums(p, 0, 100, 2); return (Math.random() * (dp[1] - dp[0]) + dp[0]).toFixed(dp[2]); }
    if (field.type === "date") { var range = p.split(","); return randomDate(range[0] || "2024/01/01", range[1] || "2024/12/31"); }
    if (field.type === "boolean") return Math.random() > 0.5 ? "true" : "false";
    if (field.type === "uuid") return uuid4();
    if (field.type === "pick") { var parts = p.split(",").filter(Boolean); return parts.length ? parts[index % parts.length] : ""; }
    if (field.type === "sequence") { var sp = nums(p, 1, 1); return String(sp[0] + index * sp[1]); }
    return "value" + (index + 1);
  }

  function nums(text, a, b, c) {
    var parts = String(text || "").split(",").map(Number);
    return [isFinite(parts[0]) ? parts[0] : a, isFinite(parts[1]) ? parts[1] : b, isFinite(parts[2]) ? parts[2] : c];
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomDate(start, end) {
    var a = Date.parse(start.replace(/\//g, "-"));
    var b = Date.parse(end.replace(/\//g, "-"));
    if (!isFinite(a) || !isFinite(b)) { a = Date.UTC(2024, 0, 1); b = Date.UTC(2024, 11, 31); }
    var d = new Date(a + Math.random() * (b - a));
    return [d.getFullYear(), pad2(d.getMonth() + 1), pad2(d.getDate())].join("/");
  }

  function uuid4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === "x" ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

