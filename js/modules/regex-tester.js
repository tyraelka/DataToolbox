"use strict";
  App.RegexTester = (function () {
    var timer = null;
    function init(container) {
      container.innerHTML = '<div class="panel"><h2>' + t("tool_regex") + '</h2><div class="field-row"><input id="rx-pattern" type="text" placeholder="' + t("pattern") + '"><input id="rx-flags" type="text" value="g" placeholder="gims"><select id="rx-template"><option value="">' + t("template") + '</option><option value="^[^@\\\\s]+@[^@\\\\s]+\\\\.[^@\\\\s]+$">Email</option><option value="09\\\\d{8}">' + t("type_mobile") + '</option><option value="https?://[^\\\\s]+">URL</option><option value="\\\\d{4}[/-]\\\\d{1,2}[/-]\\\\d{1,2}">YYYY/M/D</option></select></div><textarea id="rx-text" maxlength="200000" placeholder="' + t("test_text") + '"></textarea><div class="field-row"><input id="rx-replace" type="text" placeholder="' + t("replace_preview") + ' $1"><span id="rx-warn" class="badge warning"></span></div><div class="two-col"><div><h3>' + t("matches") + '</h3><div id="rx-output" class="regex-output"></div></div><div><h3>' + t("details") + '</h3><div id="rx-details" class="pre-box"></div></div></div></div>';
      ["rx-pattern", "rx-flags", "rx-text", "rx-replace"].forEach(function (id) { container.querySelector("#" + id).addEventListener("input", function () { debounce(container); }); });
      container.querySelector("#rx-template").addEventListener("change", function (ev) { if (ev.target.value) { container.querySelector("#rx-pattern").value = ev.target.value; debounce(container); } });
    }
    function debounce(container) {
      clearTimeout(timer);
      timer = setTimeout(function () { render(container); }, 300);
    }
    function render(container) {
      var pattern = container.querySelector("#rx-pattern").value;
      var flags = container.querySelector("#rx-flags").value;
      var text = container.querySelector("#rx-text").value;
      var compiled = App.RegexUtil.safeCompile(pattern, flags);
      container.querySelector("#rx-warn").textContent = compiled.warning || compiled.error || "";
      if (!compiled.ok) return;
      var matched = App.RegexUtil.safeMatch(compiled.regex, text, 200);
      if (matched.timedOut) container.querySelector("#rx-warn").textContent = t("regex_too_complex");
      container.querySelector("#rx-output").innerHTML = highlightMatches(text, matched.matches);
      container.querySelector("#rx-details").textContent = matched.matches.map(function (m, i) { return "#" + (i + 1) + " @" + m.index + ": " + m.text + (m.groups.length ? " [" + m.groups.join(", ") + "]" : ""); }).join("\n");
      var repl = container.querySelector("#rx-replace").value;
      if (repl) container.querySelector("#rx-details").textContent += "\n\n" + t("replace_preview") + ":\n" + text.replace(compiled.regex, repl);
    }
    return { init: init, destroy: function () {} };
  })();

  function highlightMatches(text, matches) {
    var html = "";
    var pos = 0;
    matches.forEach(function (m) {
      html += App.UI.escapeHtml(text.slice(pos, m.index));
      html += '<span class="match-highlight">' + App.UI.escapeHtml(text.slice(m.index, m.index + m.text.length)) + "</span>";
      pos = m.index + m.text.length;
    });
    html += App.UI.escapeHtml(text.slice(pos));
    return html;
  }

