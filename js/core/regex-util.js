"use strict";
  App.RegexUtil = (function () {
    function nestedWarning(pattern) {
      return /(\([^)]*[+*][^)]*\)[+*?])/.test(pattern) ? "Nested quantifier risk" : "";
    }
    function safeCompile(pattern, flags) {
      try {
        flags = (flags || "").replace(/[^gimsuy]/g, "");
        var regex = new RegExp(pattern, flags);
        return { ok: true, regex: regex, warning: nestedWarning(pattern) };
      } catch (err) {
        return { ok: false, error: err.message, warning: nestedWarning(pattern) };
      }
    }
    function safeMatch(regex, text, timeoutMs) {
      timeoutMs = timeoutMs || 200;
      text = String(text || "");
      var start = performance.now();
      var flags = regex.flags.indexOf("g") >= 0 ? regex.flags : regex.flags + "g";
      var re = new RegExp(regex.source, flags);
      var matches = [];
      var m;
      while ((m = re.exec(text)) !== null) {
        matches.push({ index: m.index, text: m[0], groups: Array.prototype.slice.call(m, 1) });
        if (m[0] === "") re.lastIndex += 1;
        if (performance.now() - start > timeoutMs) return { timedOut: true, matches: matches };
      }
      return { timedOut: false, matches: matches };
    }
    return { safeCompile: safeCompile, safeMatch: safeMatch, nestedWarning: nestedWarning };
  })();

