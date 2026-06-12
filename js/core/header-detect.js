"use strict";
  (function (factory) {
    var api = factory();
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (typeof window !== "undefined") {
      window.App = window.App || {};
      window.App.HeaderDetect = api;
    }
  })(function () {
    var MAX_SCAN = 30;
    var MAX_HEADER_ROWS = 3;
    var MODAL_SAMPLE = 300;
    var WIDTH_SAMPLE = 50;

    function isEmptyCell(value) {
      return value == null || String(value).trim() === "";
    }

    function isNumericCell(value) {
      return /^-?[\d,]+(\.\d+)?%?$/.test(String(value).trim());
    }

    function isDateCell(value) {
      var s = String(value).trim();
      return /^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(s) || /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/.test(s);
    }

    function rowFeatures(row) {
      var nonEmpty = 0;
      var dataCount = 0;
      (row || []).forEach(function (cell) {
        if (isEmptyCell(cell)) return;
        nonEmpty++;
        if (isNumericCell(cell) || isDateCell(cell)) dataCount++;
      });
      return {
        nonEmpty: nonEmpty,
        dataCount: dataCount,
        textRatio: nonEmpty ? (nonEmpty - dataCount) / nonEmpty : 0
      };
    }

    function modalNonEmpty(grid) {
      var counts = {};
      var limit = Math.min(grid.length, MODAL_SAMPLE);
      for (var r = 0; r < limit; r++) {
        var n = rowFeatures(grid[r]).nonEmpty;
        if (n > 0) counts[n] = (counts[n] || 0) + 1;
      }
      var modal = 0;
      var best = -1;
      Object.keys(counts).forEach(function (key) {
        var n = Number(key);
        if (counts[key] > best || (counts[key] === best && n > modal)) {
          best = counts[key];
          modal = n;
        }
      });
      return modal;
    }

    function horizontalMerges(merges, absRow) {
      return (merges || []).filter(function (m) {
        return m.s.r === absRow && m.e.r === absRow && m.e.c > m.s.c;
      });
    }

    /* group rows are sparse text rows directly above the leaf header row:
       2+ text cells, or a single cell whose horizontal merge covers only
       part of the table width (a full-width merge is a report title) */
    function looksLikeGroupRow(feat, absRow, merges, modal) {
      if (feat.nonEmpty === 0 || feat.dataCount > 0) return false;
      if (feat.nonEmpty >= 2) return true;
      var spans = horizontalMerges(merges, absRow);
      if (!spans.length) return false;
      var widest = 0;
      spans.forEach(function (m) { widest = Math.max(widest, m.e.c - m.s.c + 1); });
      return widest < modal;
    }

    function analyze(grid, merges) {
      grid = grid || [];
      if (!grid.length) return { headerStart: 0, headerRows: 1, confidence: 0 };
      var modal = modalNonEmpty(grid);
      if (!modal) return { headerStart: 0, headerRows: 1, confidence: 0 };
      var junkMax = Math.min(modal - 1, Math.max(2, Math.round(modal * 0.3)));
      var scan = Math.min(grid.length, MAX_SCAN);
      var leaf = -1;
      for (var r = 0; r < scan; r++) {
        var feat = rowFeatures(grid[r]);
        if (feat.nonEmpty === 0 || feat.nonEmpty <= junkMax) continue;
        leaf = r;
        break;
      }
      if (leaf < 0) return { headerStart: 0, headerRows: 1, confidence: 0 };
      var leafFeat = rowFeatures(grid[leaf]);
      if (leafFeat.textRatio < 0.6) {
        return { headerStart: leaf, headerRows: 1, confidence: 0.3 };
      }
      var first = leaf;
      while (first > 0 && leaf - first < MAX_HEADER_ROWS - 1) {
        var up = first - 1;
        if (!looksLikeGroupRow(rowFeatures(grid[up]), up, merges, modal)) break;
        first = up;
      }
      var confidence = 0.5;
      var next = grid[leaf + 1] ? rowFeatures(grid[leaf + 1]) : null;
      if (next && next.dataCount > 0 && leafFeat.dataCount === 0) confidence += 0.3;
      if (leafFeat.nonEmpty >= modal) confidence += 0.15;
      return { headerStart: first, headerRows: leaf - first + 1, confidence: Math.min(confidence, 0.95) };
    }

    function clamp(value, min, max) {
      value = Math.floor(Number(value));
      if (isNaN(value)) return min;
      return Math.max(min, Math.min(max, value));
    }

    function expandMerges(grid, absRow, merges, width) {
      var out = new Array(width);
      var source = grid[absRow] || [];
      for (var c = 0; c < width; c++) out[c] = source[c] == null ? null : source[c];
      (merges || []).forEach(function (m) {
        if (absRow < m.s.r || absRow > m.e.r) return;
        var anchor = grid[m.s.r] ? grid[m.s.r][m.s.c] : null;
        if (isEmptyCell(anchor)) return;
        for (var c = m.s.c; c <= m.e.c && c < width; c++) out[c] = anchor;
      });
      return out;
    }

    function forwardFill(cells) {
      var out = cells.slice();
      for (var c = 1; c < out.length; c++) {
        if (isEmptyCell(out[c]) && !isEmptyCell(out[c - 1])) out[c] = out[c - 1];
      }
      return out;
    }

    function dedupe(names) {
      var seen = {};
      return names.map(function (name) {
        if (seen[name]) {
          seen[name] += 1;
          return name + "_" + seen[name];
        }
        seen[name] = 1;
        return name;
      });
    }

    function build(grid, options) {
      grid = grid || [];
      options = options || {};
      var merges = options.merges || [];
      var maxStart = Math.max(0, grid.length - 1);
      var headerStart = clamp(options.headerStart, 0, maxStart);
      var headerRows = clamp(options.headerRows, 0, Math.min(MAX_HEADER_ROWS, grid.length - headerStart));
      var rows = grid.slice(headerStart + headerRows);
      var width = 0;
      for (var r = 0; r < headerRows; r++) {
        width = Math.max(width, (grid[headerStart + r] || []).length);
      }
      var sample = Math.min(rows.length, WIDTH_SAMPLE);
      for (var d = 0; d < sample; d++) {
        width = Math.max(width, (rows[d] || []).length);
      }
      var names = [];
      var groups = [];
      if (headerRows === 0) {
        for (var c = 0; c < width; c++) {
          names.push("Column " + (c + 1));
          groups.push(null);
        }
      } else {
        var levels = [];
        for (var h = 0; h < headerRows; h++) {
          var abs = headerStart + h;
          var cells = expandMerges(grid, abs, merges, width);
          if (h < headerRows - 1) cells = forwardFill(cells);
          levels.push(cells);
        }
        for (var i = 0; i < width; i++) {
          var parts = [];
          levels.forEach(function (level) {
            var value = isEmptyCell(level[i]) ? "" : String(level[i]).trim();
            if (value && parts[parts.length - 1] !== value) parts.push(value);
          });
          names.push(parts.length ? parts.join("_") : "Column " + (i + 1));
          groups.push(parts.length > 1 ? parts.slice(0, parts.length - 1).join("_") : null);
        }
      }
      return { headers: dedupe(names), rows: rows, groups: groups };
    }

    return { analyze: analyze, build: build };
  });
