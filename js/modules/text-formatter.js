"use strict";
  App.TextFormatter = (function () {
    var timer = null;
    var currentHtml = "";

    var FONTS = {
      jhenghei: "'Microsoft JhengHei', 'PMingLiU', sans-serif",
      calibri: "Calibri, Arial, sans-serif",
      arial: "Arial, Helvetica, sans-serif",
      times: "'Times New Roman', PMingLiU, serif",
      kai: "'DFKai-SB', 'BiauKai', serif"
    };
    var SIZES = { small: 11, medium: 12, large: 14 };

    var SAMPLE = "# 會議重點\n\n本週進度如下，**請於週五前回覆**。\n\n- 系統上線時程確認\n- 資料清整 *持續進行*\n\n項目\t負責人\t狀態\n資料庫搬遷\t王小明\t完成\n報表改版\t陳大文\t進行中\n\n> 備註：詳細內容請見附件。";

    function init(container) {
      container.innerHTML =
        '<div class="panel"><h2>' + t("tool_format") + "</h2>" +
        '<div class="field-row">' +
        "<label>" + t("fmt_font") + '</label><select id="fmt-font">' +
        '<option value="jhenghei">微軟正黑體</option>' +
        '<option value="calibri">Calibri</option>' +
        '<option value="arial">Arial</option>' +
        '<option value="times">Times New Roman</option>' +
        '<option value="kai">標楷體</option>' +
        "</select>" +
        "<label>" + t("fmt_size") + '</label><select id="fmt-size">' +
        '<option value="small">' + t("size_small") + " 11pt</option>" +
        '<option value="medium" selected>' + t("size_medium") + " 12pt</option>" +
        '<option value="large">' + t("size_large") + " 14pt</option>" +
        "</select>" +
        "<label>" + t("fmt_color") + '</label><input id="fmt-color" type="color" value="#2f5496">' +
        "<label>" + t("fmt_table_style") + '</label><select id="fmt-table">' +
        '<option value="striped">' + t("fmt_striped") + "</option>" +
        '<option value="grid">' + t("fmt_grid") + "</option>" +
        '<option value="plain">' + t("fmt_plain") + "</option>" +
        "</select></div>" +
        '<div class="two-col fmt-cols">' +
        "<div><h3>" + t("fmt_input") + "</h3>" +
        '<div class="toolbar fmt-tools">' +
        '<button data-md="h1" class="btn small" type="button">' + t("fmt_h1") + "</button>" +
        '<button data-md="h2" class="btn small" type="button">' + t("fmt_h2") + "</button>" +
        '<button data-md="h3" class="btn small" type="button">' + t("fmt_h3") + "</button>" +
        '<button data-md="bold" class="btn small" type="button"><b>' + t("fmt_bold") + "</b></button>" +
        '<button data-md="italic" class="btn small" type="button"><i>' + t("fmt_italic") + "</i></button>" +
        '<button data-md="list" class="btn small" type="button">' + t("fmt_list") + "</button>" +
        '<button data-md="olist" class="btn small" type="button">' + t("fmt_olist") + "</button>" +
        '<button data-md="quote" class="btn small" type="button">' + t("fmt_quote") + "</button>" +
        '<button data-md="link" class="btn small" type="button">' + t("fmt_link") + "</button>" +
        '<button data-md="table" class="btn small" type="button">' + t("fmt_table") + "</button>" +
        '<button data-md="hr" class="btn small" type="button">' + t("fmt_hr") + "</button>" +
        "</div>" +
        '<textarea id="fmt-input" maxlength="200000" placeholder="' + t("fmt_hint") + '"></textarea>' +
        '<details class="fmt-help"><summary>' + t("fmt_help") + "</summary><div>" +
        "選取文字後點上方按鈕即可套用，不必手打符號。<br>" +
        "# 大標題　## 中標題　### 小標題<br>" +
        "**粗體**　*斜體*　`程式碼`<br>" +
        "- 項目清單　1. 編號清單　&gt; 引言　--- 分隔線<br>" +
        "[顯示文字](https://...)，或直接貼上網址自動成為連結<br>" +
        "表格：從 Excel 複製範圍直接貼上，或點「表格」插入範本；欄與欄之間以 Tab 分隔（輸入框內可直接按 Tab 鍵）" +
        "</div></details></div>" +
        "<div><h3>" + t("preview") + '</h3><div id="fmt-preview" class="fmt-preview"></div></div></div>' +
        '<div class="toolbar">' +
        '<button id="fmt-copy" class="btn primary" type="button">' + t("fmt_copy_rich") + "</button>" +
        '<button id="fmt-copy-html" class="btn" type="button">' + t("fmt_copy_html") + "</button>" +
        '<label><input id="fmt-show-src" type="checkbox"> ' + t("fmt_show_src") + "</label></div>" +
        '<pre id="fmt-src" class="pre-box hidden"></pre></div>';

      var ta = container.querySelector("#fmt-input");
      ta.value = SAMPLE;
      ta.addEventListener("input", function () { debounce(container); });
      /* keep Tab inside the textarea so hand-typed tables are possible */
      ta.addEventListener("keydown", function (ev) {
        if (ev.key === "Tab") {
          ev.preventDefault();
          wrapSel(ta, "\t", "", "");
          debounce(container);
        }
      });
      container.querySelectorAll("[data-md]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          applyMd(ta, btn.dataset.md);
          render(container);
        });
      });
      ["fmt-font", "fmt-size", "fmt-color", "fmt-table"].forEach(function (id) {
        container.querySelector("#" + id).addEventListener("input", function () { render(container); });
      });
      container.querySelector("#fmt-show-src").addEventListener("change", function (ev) {
        container.querySelector("#fmt-src").classList.toggle("hidden", !ev.target.checked);
      });
      container.querySelector("#fmt-copy").addEventListener("click", function () {
        copyRich(currentHtml, container.querySelector("#fmt-input").value);
      });
      container.querySelector("#fmt-copy-html").addEventListener("click", function () {
        copyText(currentHtml, t("fmt_copied_html"));
      });
      render(container);
    }

    function debounce(container) {
      clearTimeout(timer);
      timer = setTimeout(function () { render(container); }, 250);
    }

    function readOptions(container) {
      return {
        font: FONTS[container.querySelector("#fmt-font").value] || FONTS.jhenghei,
        size: SIZES[container.querySelector("#fmt-size").value] || 12,
        color: container.querySelector("#fmt-color").value || "#2f5496",
        tableStyle: container.querySelector("#fmt-table").value
      };
    }

    function render(container) {
      currentHtml = buildHtml(container.querySelector("#fmt-input").value, readOptions(container));
      container.querySelector("#fmt-preview").innerHTML = currentHtml;
      container.querySelector("#fmt-src").textContent = currentHtml;
    }

    /* ---------- editor toolbar actions ---------- */

    var TABLE_TPL = "欄位一\t欄位二\t欄位三\n內容\t內容\t內容\n內容\t內容\t內容";

    function setValue(ta, value, selStart, selEnd) {
      ta.value = value;
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    }

    function wrapSel(ta, before, after, placeholder) {
      var v = ta.value;
      var s = ta.selectionStart;
      var e = ta.selectionEnd;
      var sel = v.slice(s, e) || placeholder;
      setValue(ta, v.slice(0, s) + before + sel + after + v.slice(e),
        s + before.length, s + before.length + sel.length);
    }

    function prefixLines(ta, prefix, numbered) {
      var v = ta.value;
      var s = ta.selectionStart;
      var e = ta.selectionEnd;
      var ls = v.lastIndexOf("\n", s - 1) + 1;
      var le = v.indexOf("\n", e);
      if (le < 0) le = v.length;
      var seg = v.slice(ls, le).split("\n").map(function (line, idx) {
        return (numbered ? (idx + 1) + ". " : prefix) + line;
      }).join("\n");
      setValue(ta, v.slice(0, ls) + seg + v.slice(le), ls, ls + seg.length);
    }

    function insertBlock(ta, text) {
      var v = ta.value;
      var s = ta.selectionStart;
      var head = s > 0 && v.charAt(s - 1) !== "\n" ? "\n" : "";
      var tail = v.charAt(s) && v.charAt(s) !== "\n" ? "\n" : "";
      var ins = head + text + tail;
      setValue(ta, v.slice(0, s) + ins + v.slice(s), s + ins.length, s + ins.length);
    }

    function applyMd(ta, act) {
      if (act === "h1") prefixLines(ta, "# ");
      else if (act === "h2") prefixLines(ta, "## ");
      else if (act === "h3") prefixLines(ta, "### ");
      else if (act === "bold") wrapSel(ta, "**", "**", "粗體文字");
      else if (act === "italic") wrapSel(ta, "*", "*", "斜體文字");
      else if (act === "list") prefixLines(ta, "- ");
      else if (act === "olist") prefixLines(ta, "", true);
      else if (act === "quote") prefixLines(ta, "> ");
      else if (act === "link") wrapSel(ta, "[", "](https://)", "連結文字");
      else if (act === "table") insertBlock(ta, TABLE_TPL);
      else if (act === "hr") insertBlock(ta, "---");
    }

    /* ---------- markdown-lite -> Outlook-safe inline HTML ---------- */

    function esc(value) { return App.UI.escapeHtml(value); }

    function link(url, label, o) {
      return '<a href="' + url + '" style="color:' + o.color + ';">' + label + "</a>";
    }

    function inline(s, o) {
      s = esc(s);
      s = s.replace(/`([^`]+)`/g, function (_, code) {
        return '<span style="font-family:Consolas,monospace;font-size:90%;background:#f2f2f2;border:1pt solid #e0e0e0;padding:0 3pt;">' + code + "</span>";
      });
      s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
      s = s.replace(/(^|[^*])\*([^*]+)\*/g, "$1<i>$2</i>");
      s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, function (_, label, url) { return link(url, label, o); });
      s = s.replace(/(^|[\s　])(https?:\/\/[^\s<]+)/g, function (_, pre, url) { return pre + link(url, url, o); });
      return s;
    }

    function isTableLine(s) {
      return s.indexOf("\t") >= 0 || /^\s*\|.+\|\s*$/.test(s);
    }

    function splitRow(s) {
      if (s.indexOf("\t") >= 0) return s.split("\t");
      return s.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(function (c) { return c.trim(); });
    }

    function buildTable(raw, o) {
      var rows = [];
      raw.forEach(function (line) {
        if (/^[\s|:\-]+$/.test(line)) return; /* markdown separator row */
        rows.push(splitRow(line));
      });
      if (!rows.length) return "";
      var cols = Math.max.apply(null, rows.map(function (r) { return r.length; }));
      var pad = "padding:5pt 10pt;";
      var html = '<table style="border-collapse:collapse;margin:0 0 12pt;font-size:' + o.size + 'pt;">';
      rows.forEach(function (r, idx) {
        html += "<tr>";
        for (var c = 0; c < cols; c++) {
          var v = inline(r[c] == null ? "" : r[c], o);
          if (idx === 0) {
            html += '<th style="' + pad + "background:" + o.color + ";color:#ffffff;border:1pt solid " + o.color + ';text-align:left;font-weight:bold;">' + v + "</th>";
          } else {
            var st = pad;
            if (o.tableStyle === "grid") st += "border:1pt solid #cfcfcf;";
            else st += "border-bottom:1pt solid #e3e3e3;";
            if (o.tableStyle === "striped" && idx % 2 === 0) st += "background:#f6f6f6;";
            html += '<td style="' + st + '">' + v + "</td>";
          }
        }
        html += "</tr>";
      });
      return html + "</table>";
    }

    function buildHtml(text, o) {
      var lines = String(text || "").split(/\r?\n/);
      var out = [];
      var i = 0;
      var HEADINGS = [
        { size: 18, margin: "14pt 0 8pt" },
        { size: 15, margin: "12pt 0 6pt" },
        { size: 13, margin: "10pt 0 6pt" }
      ];
      function isSpecial(s) {
        return /^(#{1,3}\s|>\s?|\s*([-*]|\d+[.)])\s)/.test(s) || /^\s*-{3,}\s*$/.test(s) || isTableLine(s);
      }
      while (i < lines.length) {
        var line = lines[i];
        if (!line.trim()) { i += 1; continue; }
        if (/^\s*-{3,}\s*$/.test(line)) {
          out.push('<div style="border-top:1pt solid #c9c9c9;margin:12pt 0;"></div>');
          i += 1; continue;
        }
        var hm = line.match(/^(#{1,3})\s+(.+)$/);
        if (hm) {
          var h = HEADINGS[hm[1].length - 1];
          out.push('<p style="margin:' + h.margin + ";font-size:" + h.size + "pt;font-weight:bold;color:" + o.color + ';">' + inline(hm[2], o) + "</p>");
          i += 1; continue;
        }
        if (isTableLine(line) && i + 1 < lines.length && isTableLine(lines[i + 1])) {
          var raw = [];
          while (i < lines.length && isTableLine(lines[i])) { raw.push(lines[i]); i += 1; }
          out.push(buildTable(raw, o));
          continue;
        }
        if (/^>\s?/.test(line)) {
          var q = [];
          while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(inline(lines[i].replace(/^>\s?/, ""), o)); i += 1; }
          out.push('<div style="margin:0 0 10pt;padding:6pt 12pt;border-left:3pt solid ' + o.color + ';background:#f6f6f6;color:#595959;">' + q.join("<br>") + "</div>");
          continue;
        }
        if (/^\s*([-*]|\d+[.)])\s+/.test(line)) {
          var ordered = /^\s*\d/.test(line);
          var items = [];
          while (i < lines.length && /^\s*([-*]|\d+[.)])\s+/.test(lines[i])) {
            items.push('<li style="margin:0 0 4pt;">' + inline(lines[i].replace(/^\s*([-*]|\d+[.)])\s+/, ""), o) + "</li>");
            i += 1;
          }
          var tag = ordered ? "ol" : "ul";
          out.push("<" + tag + ' style="margin:0 0 10pt;padding-left:24pt;">' + items.join("") + "</" + tag + ">");
          continue;
        }
        var para = [];
        while (i < lines.length && lines[i].trim() && !isSpecial(lines[i])) {
          para.push(inline(lines[i], o));
          i += 1;
        }
        if (!para.length) { para.push(inline(lines[i], o)); i += 1; }
        out.push('<p style="margin:0 0 10pt;">' + para.join("<br>") + "</p>");
      }
      return '<div style="font-family:' + o.font + ";font-size:" + o.size + 'pt;color:#333333;line-height:1.6;">' + out.join("") + "</div>";
    }

    /* ---------- clipboard ---------- */

    function copyText(text, okMsg) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () { App.UI.toast(okMsg, "success"); },
          function () { legacyCopyText(text, okMsg); }
        );
      } else {
        legacyCopyText(text, okMsg);
      }
    }

    function legacyCopyText(text, okMsg) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      App.UI.toast(ok ? okMsg : t("copy_failed"), ok ? "success" : "error");
    }

    function copyRich(html, plain) {
      if (navigator.clipboard && window.ClipboardItem) {
        var item = new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" })
        });
        navigator.clipboard.write([item]).then(
          function () { App.UI.toast(t("fmt_copied_rich"), "success"); },
          function () { legacyCopyRich(html); }
        );
      } else {
        legacyCopyRich(html);
      }
    }

    function legacyCopyRich(html) {
      var box = document.createElement("div");
      box.contentEditable = "true";
      box.style.position = "fixed";
      box.style.left = "-9999px";
      box.innerHTML = html;
      document.body.appendChild(box);
      var range = document.createRange();
      range.selectNodeContents(box);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      sel.removeAllRanges();
      document.body.removeChild(box);
      App.UI.toast(ok ? t("fmt_copied_rich") : t("copy_failed"), ok ? "success" : "error");
    }

    return { init: init, destroy: function () { clearTimeout(timer); } };
  })();
