"use strict";
  App.Parser = (function () {
    async function parseToTable(input, meta) {
      meta = meta || {};
      if (!input) throw new Error("No input");
      if (typeof File !== "undefined" && input instanceof File) return parseFile(input);
      if (input && input["!ref"]) return sheetToTable(input, meta);
      throw new Error("Unsupported input");
    }

    function parseFile(file) {
      return new Promise(function (resolve, reject) {
        var name = file.name.toLowerCase();
        var reader = new FileReader();
        reader.onerror = function () { reject(new Error("Cannot read file")); };
        if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
          reader.onload = function (ev) {
            try {
              var wb = XLSX.read(new Uint8Array(ev.target.result), { type: "array" });
              resolve({ workbook: wb, sheetNames: wb.SheetNames, headers: [], rows: [], meta: { sourceName: file.name } });
            } catch (err) {
              reject(new Error("Excel parse failed: " + err.message));
            }
          };
          reader.readAsArrayBuffer(file);
        } else if (name.endsWith(".json")) {
          if (file.size > 20 * 1024 * 1024) return reject(new Error("JSON file exceeds 20 MB"));
          reader.onload = function (ev) {
            try { resolve(jsonToTable(JSON.parse(ev.target.result), { sourceName: file.name })); }
            catch (err) { reject(new Error("JSON parse failed: " + err.message)); }
          };
          reader.readAsText(file, "utf-8");
        } else if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) {
          reader.onload = function (ev) {
            try { resolve(csvToTable(ev.target.result, { sourceName: file.name })); }
            catch (err) { reject(err); }
          };
          reader.readAsText(file, "utf-8");
        } else {
          reject(new Error("Unsupported file type"));
        }
      });
    }

    function sheetToTable(sheet, meta) {
      var aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
      return Promise.resolve(aoaToTable(aoa, meta));
    }

    function detectDelimiter(text) {
      if (text.indexOf("\t") >= 0) return "\t";
      var sample = text.slice(0, 5000);
      var best = ",";
      var max = -1;
      [",", ";", "|"].forEach(function (d) {
        var count = sample.split(d).length - 1;
        if (count > max) { max = count; best = d; }
      });
      return best;
    }

    function csvToTable(text, meta, delimiter) {
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      var d = delimiter || detectDelimiter(text);
      var rows = [];
      var row = [];
      var field = "";
      var inQuotes = false;
      for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        if (inQuotes) {
          if (ch === '"') {
            if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
          } else {
            field += ch;
          }
        } else if (ch === '"') {
          inQuotes = true;
        } else if (ch === d) {
          row.push(field);
          field = "";
        } else if (ch === "\n" || ch === "\r") {
          if (ch === "\r" && text[i + 1] === "\n") i++;
          row.push(field);
          if (row.length > 1 || row[0] !== "") rows.push(row);
          row = [];
          field = "";
        } else {
          field += ch;
        }
      }
      if (field !== "" || row.length) {
        row.push(field);
        rows.push(row);
      }
      return aoaToTable(rows, meta);
    }

    function jsonToTable(data, meta) {
      if (!Array.isArray(data)) throw new Error("JSON must be an array of objects");
      var headers = [];
      var seen = {};
      data.forEach(function (obj) {
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("JSON rows must be objects");
        Object.keys(obj).forEach(function (key) {
          if (!seen[key]) { seen[key] = true; headers.push(key); }
        });
      });
      headers = dedupeHeaders(headers);
      return {
        headers: headers,
        rows: data.map(function (obj) { return headers.map(function (h) { return obj[h] == null ? null : String(obj[h]); }); }),
        meta: Object.assign({ sourceName: "json", sheetName: "", totalRows: data.length }, meta || {})
      };
    }

    function aoaToTable(aoa, meta) {
      if (!aoa || !aoa.length) throw new Error("No rows found");
      var headers = dedupeHeaders((aoa[0] || []).map(function (h, i) {
        var name = String(h == null ? "" : h).trim();
        return name || "Column " + (i + 1);
      }));
      var rows = aoa.slice(1).map(function (row) {
        return headers.map(function (_, i) {
          var value = row ? row[i] : null;
          return value == null || value === "" ? null : String(value);
        });
      });
      return { headers: headers, rows: rows, meta: Object.assign({ sourceName: "", sheetName: "", totalRows: rows.length }, meta || {}) };
    }

    return { parseToTable: parseToTable, parseFile: parseFile, parseCSV: csvToTable, detectDelimiter: detectDelimiter };
  })();

