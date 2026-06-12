"use strict";
  App.Palette = (function () {
    var DEFAULT_BASE = "#2a9d8f";

    var PRESETS = [
      { name: "商務藍灰", colors: ["#16324f", "#3c5a78", "#7d97ad", "#d4dde6", "#e8a33d"] },
      { name: "海洋", colors: ["#03396c", "#005b96", "#6497b1", "#b3cde0", "#e8f1f8"] },
      { name: "森林", colors: ["#1e3d2f", "#2f5d46", "#5b8a64", "#a4c3a2", "#e8e4d8"] },
      { name: "大地色系", colors: ["#5c4733", "#8c6a4f", "#bf9a6f", "#e3cfae", "#90a583"] },
      { name: "夕陽", colors: ["#5d2a42", "#a23e48", "#e1656e", "#f6a57f", "#ffd9a0"] },
      { name: "莓果", colors: ["#4a1942", "#7b2d5e", "#b03e6e", "#e06a8a", "#f6c1cf"] },
      { name: "莫蘭迪", colors: ["#9c8e7e", "#b5a895", "#8e9e94", "#b8c0ba", "#cdb9aa"] },
      { name: "粉彩", colors: ["#ffd6e0", "#ffe8cc", "#fff3b0", "#d0f4de", "#a9def9"] },
      { name: "復古", colors: ["#823329", "#c25e3f", "#e8a956", "#f2d8a7", "#3f5a4c"] },
      { name: "高對比簡報", colors: ["#101820", "#f2aa4c", "#e4e6eb", "#3a6ea5", "#c1442e"] },
      { name: "中性灰階", colors: ["#1c1c1e", "#48484a", "#8e8e93", "#d1d1d6", "#0a84ff"] },
      { name: "工業", colors: ["#23272b", "#50565c", "#9aa0a6", "#e07a1f", "#2aa198"] }
    ];

    function init(container) {
      container.innerHTML =
        '<div class="panel"><h2>' + t("tool_palette") + "</h2>" +
        '<div class="field-row">' +
        "<label>" + t("pal_base") + '</label>' +
        '<input id="pal-color" type="color" value="' + DEFAULT_BASE + '">' +
        '<input id="pal-hex" type="text" value="' + DEFAULT_BASE + '" maxlength="7" spellcheck="false">' +
        '<button id="pal-random" class="btn" type="button">' + t("pal_random") + "</button></div>" +
        "<h3>" + t("pal_schemes") + '</h3><div id="pal-schemes"></div>' +
        "<h3>" + t("pal_scale") + '</h3><div id="pal-scale"></div>' +
        "<h3>" + t("pal_presets") + '</h3><div id="pal-presets"></div></div>';

      var colorInput = container.querySelector("#pal-color");
      var hexInput = container.querySelector("#pal-hex");

      colorInput.addEventListener("input", function () {
        hexInput.value = colorInput.value;
        update(container, colorInput.value);
      });
      hexInput.addEventListener("input", function () {
        var rgb = hexToRgb(hexInput.value);
        if (!rgb) return;
        var hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
        colorInput.value = hex;
        update(container, hex);
      });
      container.querySelector("#pal-random").addEventListener("click", function () {
        var hex = make(Math.floor(Math.random() * 360), 50 + Math.random() * 30, 40 + Math.random() * 20);
        colorInput.value = hex;
        hexInput.value = hex;
        update(container, hex);
      });

      /* one delegated handler covers every swatch and copy-all button */
      container.addEventListener("click", function (ev) {
        var sw = ev.target.closest(".swatch");
        if (sw) {
          var rgb = hexToRgb(sw.dataset.hex);
          copyText(sw.dataset.hex, t("pal_copied") + " " + sw.dataset.hex.toUpperCase() + " / RGB " + rgb.join(", "));
          return;
        }
        var all = ev.target.closest("[data-copy-all]");
        if (all) copyText(all.dataset.copyAll, t("pal_copied") + " " + all.dataset.copyAll);
      });

      container.querySelector("#pal-presets").innerHTML = PRESETS.map(function (p) {
        return block(p.name, p.colors);
      }).join("");
      update(container, DEFAULT_BASE);
    }

    function update(container, hex) {
      var rgb = hexToRgb(hex);
      if (!rgb) return;
      var hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
      var h = hsl[0], s = hsl[1], l = hsl[2];

      var schemes = [
        { key: "pal_mono", colors: [make(h, s, l - 24), make(h, s, l - 12), make(h, s, l), make(h, s, l + 12), make(h, s, l + 24)] },
        { key: "pal_analogous", colors: [make(h - 30, s, l), make(h - 15, s, l), make(h, s, l), make(h + 15, s, l), make(h + 30, s, l)] },
        { key: "pal_complementary", colors: [make(h, s, l - 12), make(h, s, l), make(h, s, l + 15), make(h + 180, s, l), make(h + 180, s, l + 15)] },
        { key: "pal_split", colors: [make(h, s, l), make(h + 150, s, l), make(h + 210, s, l), make(h, s * 0.45, l + 28), make(h + 180, s * 0.2, 92)] },
        { key: "pal_triadic", colors: [make(h, s, l), make(h + 120, s, l), make(h + 240, s, l), make(h, s * 0.4, l + 30), make(h, s * 0.15, 93)] },
        { key: "pal_tetradic", colors: [make(h, s, l), make(h + 90, s, l), make(h + 180, s, l), make(h + 270, s, l), make(h, s * 0.15, 92)] }
      ];
      container.querySelector("#pal-schemes").innerHTML = schemes.map(function (sc) {
        return block(t(sc.key), sc.colors);
      }).join("");

      var steps = [];
      for (var k = 0; k < 10; k++) steps.push(make(h, s, 94 - k * 8.7));
      container.querySelector("#pal-scale").innerHTML =
        '<div class="palette-block"><div class="palette-head"><span>' + hex.toUpperCase() +
        '</span><button type="button" class="btn small" data-copy-all="' + steps.join(", ") + '">' + t("pal_copy_all") + "</button></div>" +
        '<div class="palette-row">' + steps.map(swatch).join("") + "</div></div>";
    }

    function block(name, hexes) {
      return '<div class="palette-block"><div class="palette-head"><span>' + App.UI.escapeHtml(name) +
        '</span><button type="button" class="btn small" data-copy-all="' + hexes.join(", ") + '">' + t("pal_copy_all") + "</button></div>" +
        '<div class="palette-row">' + hexes.map(function (x) { return swatch(x); }).join("") + "</div></div>";
    }

    function swatch(hex) {
      var rgb = hexToRgb(hex);
      var lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
      var fg = lum > 0.55 ? "#1c1c1c" : "#ffffff";
      return '<button type="button" class="swatch" data-hex="' + hex + '" title="RGB ' + rgb.join(", ") +
        '" style="background:' + hex + ";color:" + fg + ';"><span>' + hex.toUpperCase() + "</span></button>";
    }

    /* ---------- color math ---------- */

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function make(h, s, l) {
      h = ((h % 360) + 360) % 360;
      s = clamp(s, 0, 100);
      l = clamp(l, 6, 96);
      var rgb = hslToRgb(h / 360, s / 100, l / 100);
      return rgbToHex(rgb[0], rgb[1], rgb[2]);
    }

    function hexToRgb(hex) {
      var m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
      if (!m) return null;
      var n = parseInt(m[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function rgbToHex(r, g, b) {
      return "#" + [r, g, b].map(function (v) {
        v = clamp(Math.round(v), 0, 255);
        return (v < 16 ? "0" : "") + v.toString(16);
      }).join("");
    }

    function rgbToHsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      var max = Math.max(r, g, b);
      var min = Math.min(r, g, b);
      var h = 0;
      var s = 0;
      var l = (max + min) / 2;
      if (max !== min) {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
      }
      return [h * 360, s * 100, l * 100];
    }

    function hslToRgb(h, s, l) {
      if (s === 0) {
        var v = Math.round(l * 255);
        return [v, v, v];
      }
      function hue(p, q, x) {
        if (x < 0) x += 1;
        if (x > 1) x -= 1;
        if (x < 1 / 6) return p + (q - p) * 6 * x;
        if (x < 1 / 2) return q;
        if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
        return p;
      }
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      return [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)].map(function (x) {
        return Math.round(x * 255);
      });
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

    return { init: init, destroy: function () {} };
  })();
