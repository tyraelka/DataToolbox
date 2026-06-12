"use strict";
  App.UI = (function () {
    function escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function showLoading(message, percent) {
      var overlay = document.getElementById("loading-overlay");
      overlay.classList.remove("hidden");
      setLoadingText(message || t("loading"), percent || 0);
    }

    function setLoadingText(message, percent) {
      document.getElementById("loading-text").textContent = message || "";
      if (typeof percent === "number") {
        document.getElementById("loading-progress").style.width = Math.max(0, Math.min(100, percent)) + "%";
      }
    }

    function hideLoading() {
      document.getElementById("loading-overlay").classList.add("hidden");
      document.getElementById("loading-progress").style.width = "0";
    }

    function toast(message, type, ms) {
      var box = document.createElement("div");
      box.className = "toast " + (type || "info");
      box.textContent = message;
      document.getElementById("toast-container").appendChild(box);
      setTimeout(function () { box.remove(); }, ms || 3800);
    }

    function renderTable(container, headers, rows, maxRows) {
      var el = typeof container === "string" ? document.querySelector(container) : container;
      if (!el) return;
      headers = headers || [];
      rows = rows || [];
      var limit = Math.min(maxRows || rows.length, rows.length, RENDER_CAP);
      var html = '<div class="table-wrap"><table class="data-table"><thead><tr>';
      headers.forEach(function (h) { html += "<th>" + escapeHtml(h) + "</th>"; });
      html += "</tr></thead><tbody>";
      rows.slice(0, limit).forEach(function (row) {
        html += "<tr>";
        headers.forEach(function (_, i) {
          html += "<td>" + escapeHtml(row ? row[i] : "") + "</td>";
        });
        html += "</tr>";
      });
      html += "</tbody></table>";
      if (rows.length > limit) {
        html += '<p class="muted" style="padding:8px 10px">' + escapeHtml(t("preview_truncated").replace("{shown}", limit.toLocaleString()).replace("{total}", rows.length.toLocaleString())) + "</p>";
      }
      html += "</div>";
      el.innerHTML = html;
    }

    function renderCompareTable(before, after, options) {
      options = options || {};
      var headers = options.headers || before.headers || after.headers || [];
      var bRows = before.rows || [];
      var aRows = after.rows || [];
      var max = Math.min(options.maxRows || PREVIEW_CAP, Math.max(bRows.length, aRows.length), RENDER_CAP);
      var html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>' + t("row_no") + '</th>';
      headers.forEach(function (h) { html += "<th>" + escapeHtml(h) + "</th>"; });
      html += "</tr></thead><tbody>";
      for (var r = 0; r < max; r++) {
        html += "<tr><td>" + (r + 1) + "</td>";
        for (var c = 0; c < headers.length; c++) {
          var bv = bRows[r] ? bRows[r][c] : "";
          var av = aRows[r] ? aRows[r][c] : "";
          var changed = String(bv == null ? "" : bv) !== String(av == null ? "" : av);
          html += '<td class="' + (changed ? "cell-changed" : "") + '">';
          html += '<span class="muted">' + escapeHtml(bv) + "</span><br>" + escapeHtml(av);
          html += "</td>";
        }
        html += "</tr>";
      }
      html += "</tbody></table></div>";
      return html;
    }

    function download(filename, blob) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
    }

    function tableToObjects(table) {
      return table.rows.map(function (row) {
        var obj = {};
        table.headers.forEach(function (h, i) { obj[h] = row[i] == null ? null : row[i]; });
        return obj;
      });
    }

    function exportJSON(table, filename) {
      var text = JSON.stringify(tableToObjects(normalizeTable(table)), null, 2);
      download(filename || "data.json", new Blob([text], { type: "application/json;charset=utf-8" }));
    }

    function csvEscape(value, delimiter) {
      var s = String(value == null ? "" : value);
      if (s.indexOf('"') >= 0 || s.indexOf("\n") >= 0 || s.indexOf("\r") >= 0 || s.indexOf(delimiter) >= 0) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }

    function exportCSV(table, filename, options) {
      table = normalizeTable(table);
      options = options || {};
      var delimiter = options.delimiter || ",";
      var lines = [];
      lines.push(table.headers.map(function (h) { return csvEscape(h, delimiter); }).join(delimiter));
      table.rows.forEach(function (row) {
        lines.push(table.headers.map(function (_, i) { return csvEscape(row[i], delimiter); }).join(delimiter));
      });
      var body = (options.bom === false ? "" : "\uFEFF") + lines.join("\r\n");
      download(filename || "data.csv", new Blob([body], { type: "text/csv;charset=utf-8" }));
    }

    function exportXLSX(table, filename) {
      table = normalizeTable(table);
      var aoa = [table.headers].concat(table.rows);
      var ws = XLSX.utils.aoa_to_sheet(aoa);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, filename || "data.xlsx");
    }

    function exportPNG(canvas, filename) {
      if (!canvas) return;
      canvas.toBlob(function (blob) { if (blob) download(filename || "chart.png", blob); });
    }

    function createUploader(options) {
      var container = options.container;
      container.innerHTML = "";
      var drop = document.createElement("div");
      drop.className = "dropzone";
      drop.textContent = options.label || t("upload_hint");
      var input = document.createElement("input");
      input.type = "file";
      input.className = "hidden";
      input.multiple = !!options.multiple;
      input.accept = (options.accept || [".xlsx", ".xls", ".csv", ".tsv", ".json"]).join(",");
      var sheetBox = document.createElement("div");
      sheetBox.className = "field-row hidden";
      var confirmBox = document.createElement("div");
      container.appendChild(drop);
      container.appendChild(input);
      container.appendChild(sheetBox);
      container.appendChild(confirmBox);

      function handleFiles(fileList) {
        var files = Array.prototype.slice.call(fileList || []);
        if (!files.length) return;
        if (options.multiple) {
          parseMany(files, options);
        } else {
          parseOne(files[0], options, sheetBox, confirmBox);
        }
      }

      drop.addEventListener("click", function () { input.click(); });
      input.addEventListener("change", function () {
        handleFiles(input.files);
        input.value = "";
      });
      ["dragover", "dragenter"].forEach(function (name) {
        drop.addEventListener(name, function (ev) {
          ev.preventDefault();
          drop.classList.add("dragover");
        });
      });
      ["dragleave", "drop"].forEach(function (name) {
        drop.addEventListener(name, function (ev) {
          ev.preventDefault();
          drop.classList.remove("dragover");
          if (name === "drop") handleFiles(ev.dataTransfer.files);
        });
      });
      return { drop: drop, input: input };
    }

    async function parseOne(file, options, sheetBox, confirmBox) {
      try {
        showLoading(t("loading"), 5);
        var parsed = await App.Parser.parseToTable(file);
        if (parsed.workbook) {
          renderSheetPicker(file, parsed, options, sheetBox, confirmBox);
        } else {
          await confirmRows(parsed.rows.length);
          showHeaderConfirm(parsed, options, confirmBox);
        }
      } catch (err) {
        if (options.onError) options.onError(err.message);
        toast(err.message, "error", 6000);
      } finally {
        hideLoading();
      }
    }

    async function parseMany(files, options) {
      try {
        showLoading(t("loading"), 5);
        var out = [];
        for (var i = 0; i < files.length; i++) {
          var parsed = await App.Parser.parseToTable(files[i]);
          if (parsed.workbook) {
            parsed = await App.Parser.parseToTable(parsed.workbook.Sheets[parsed.workbook.SheetNames[0]], {
              sourceName: files[i].name,
              sheetName: parsed.workbook.SheetNames[0]
            });
          }
          out.push(parsed);
          setLoadingText(t("loading") + " " + (i + 1) + " / " + files.length, Math.round((i + 1) / files.length * 100));
          await tick();
        }
        options.onParsed(out);
      } catch (err) {
        if (options.onError) options.onError(err.message);
        toast(err.message, "error", 6000);
      } finally {
        hideLoading();
      }
    }

    function renderSheetPicker(file, parsed, options, sheetBox, confirmBox) {
      sheetBox.classList.remove("hidden");
      sheetBox.innerHTML = '<label>' + t("sheet") + '</label><select></select>';
      var select = sheetBox.querySelector("select");
      parsed.workbook.SheetNames.forEach(function (name) {
        var opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
      });
      async function loadSheet() {
        var table = await App.Parser.parseToTable(parsed.workbook.Sheets[select.value], {
          sourceName: file.name,
          sheetName: select.value
        });
        await confirmRows(table.rows.length);
        showHeaderConfirm(table, options, confirmBox);
      }
      select.addEventListener("change", loadSheet);
      loadSheet();
    }

    function showHeaderConfirm(parsed, options, confirmBox) {
      if (!parsed.raw || !confirmBox) {
        if (confirmBox) confirmBox.innerHTML = "";
        options.onParsed(parsed);
        return;
      }
      var grid = parsed.raw.grid;
      var maxStart = Math.min(Math.max(0, grid.length - 1), 50);
      confirmBox.innerHTML = '<div class="header-confirm">' +
        '<p class="muted" data-summary></p>' +
        '<div class="field-row">' +
        '<label>' + t("hd_start") + ' <input type="number" data-start min="0" max="' + maxStart + '" step="1"></label>' +
        '<label>' + t("hd_rows") + ' <input type="number" data-rows min="0" max="3" step="1"></label>' +
        '<button class="btn primary" type="button" data-confirm>' + t("hd_confirm") + '</button>' +
        '</div><div data-preview></div></div>';
      var startInput = confirmBox.querySelector("[data-start]");
      var rowsInput = confirmBox.querySelector("[data-rows]");
      var summary = confirmBox.querySelector("[data-summary]");
      var preview = confirmBox.querySelector("[data-preview]");
      startInput.value = parsed.raw.detect.headerStart;
      rowsInput.value = parsed.raw.detect.headerRows;
      var current = parsed;
      function clampInput(el, max) {
        var n = Math.floor(Number(el.value));
        if (isNaN(n)) n = 0;
        return Math.max(0, Math.min(max, n));
      }
      function update() {
        var start = clampInput(startInput, maxStart);
        var rows = clampInput(rowsInput, 3);
        current = App.Parser.rebuild(parsed, start, rows);
        summary.textContent = t("hd_summary").replace("{skip}", start).replace("{rows}", rows);
        renderTable(preview, current.headers, current.rows, 8);
      }
      startInput.addEventListener("input", update);
      rowsInput.addEventListener("input", update);
      confirmBox.querySelector("[data-confirm]").addEventListener("click", function () {
        confirmBox.innerHTML = "";
        options.onParsed(current);
      });
      update();
    }

    async function confirmRows(count) {
      if (count > ROW_WARN && !window.confirm("This file has " + count.toLocaleString() + " rows. Continue?")) {
        throw new Error("Canceled");
      }
    }

    return {
      escapeHtml: escapeHtml,
      showLoading: showLoading,
      setLoadingText: setLoadingText,
      hideLoading: hideLoading,
      toast: toast,
      renderTable: renderTable,
      renderCompareTable: renderCompareTable,
      createUploader: createUploader,
      exportXLSX: exportXLSX,
      exportCSV: exportCSV,
      exportJSON: exportJSON,
      exportPNG: exportPNG,
      download: download,
      tableToObjects: tableToObjects
    };
  })();

