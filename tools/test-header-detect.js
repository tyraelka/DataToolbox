"use strict";
/* node tools/test-header-detect.js */
var assert = require("assert");
var HD = require("../js/core/header-detect.js");

var passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log("ok - " + name);
}

check("clean table keeps first row as header", function () {
  var grid = [
    ["name", "age", "city"],
    ["amy", "30", "taipei"],
    ["bob", "25", "tainan"]
  ];
  var d = HD.analyze(grid, []);
  assert.strictEqual(d.headerStart, 0);
  assert.strictEqual(d.headerRows, 1);
  var t = HD.build(grid, d);
  assert.deepStrictEqual(t.headers, ["name", "age", "city"]);
  assert.strictEqual(t.rows.length, 2);
});

check("title + blank rows are skipped", function () {
  var grid = [
    ["2026年度銷售報表", null, null, null],
    [null, null, null, null],
    ["製表日期：2026/6/1", null, null, null],
    ["品名", "數量", "單價", "金額"],
    ["蘋果", "10", "30", "300"],
    ["香蕉", "5", "20", "100"]
  ];
  var d = HD.analyze(grid, []);
  assert.strictEqual(d.headerStart, 3);
  assert.strictEqual(d.headerRows, 1);
  var t = HD.build(grid, d);
  assert.deepStrictEqual(t.headers, ["品名", "數量", "單價", "金額"]);
  assert.strictEqual(t.rows.length, 2);
});

check("group header without merges (forward fill)", function () {
  var grid = [
    ["報表標題", null, null, null, null],
    [null, "groupA", null, "groupB", null],
    ["ID", "h1", "h2", "h1", "h2"],
    ["1", "a", "b", "c", "d"],
    ["2", "e", "f", "g", "h"]
  ];
  var d = HD.analyze(grid, []);
  assert.strictEqual(d.headerStart, 1);
  assert.strictEqual(d.headerRows, 2);
  var t = HD.build(grid, d);
  assert.deepStrictEqual(t.headers, ["ID", "groupA_h1", "groupA_h2", "groupB_h1", "groupB_h2"]);
  assert.strictEqual(t.rows.length, 2);
});

check("group header with merges (single-cell group row)", function () {
  /* one merged group cell spanning part of the width on row 1 */
  var grid = [
    [null, "groupA", null, null, null],
    ["ID", "h1", "h2", "h3", "h4"],
    ["1", "a", "b", "c", "d"]
  ];
  var merges = [{ s: { r: 0, c: 1 }, e: { r: 0, c: 2 } }];
  var d = HD.analyze(grid, merges);
  assert.strictEqual(d.headerStart, 0);
  assert.strictEqual(d.headerRows, 2);
  var t = HD.build(grid, { headerStart: d.headerStart, headerRows: d.headerRows, merges: merges });
  assert.deepStrictEqual(t.headers[1], "groupA_h1");
  assert.deepStrictEqual(t.headers[2], "groupA_h2");
});

check("full-width merged title is junk, not a group", function () {
  var grid = [
    ["年度報表", null, null, null],
    ["品名", "數量", "單價", "金額"],
    ["蘋果", "10", "30", "300"]
  ];
  var merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
  var d = HD.analyze(grid, merges);
  assert.strictEqual(d.headerStart, 1);
  assert.strictEqual(d.headerRows, 1);
});

check("vertical merge keeps single name", function () {
  var grid = [
    ["ID", "groupA", "groupA2"],
    [null, "h1", "h2"],
    ["1", "a", "b"]
  ];
  var merges = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }];
  var t = HD.build(grid, { headerStart: 0, headerRows: 2, merges: merges });
  assert.strictEqual(t.headers[0], "ID");
  assert.strictEqual(t.headers[1], "groupA_h1");
});

check("headerRows 0 generates Column N", function () {
  var grid = [
    ["1", "2", "3"],
    ["4", "5", "6"]
  ];
  var t = HD.build(grid, { headerStart: 0, headerRows: 0 });
  assert.deepStrictEqual(t.headers, ["Column 1", "Column 2", "Column 3"]);
  assert.strictEqual(t.rows.length, 2);
});

check("numeric-only data falls back to first row", function () {
  var grid = [
    ["1", "2", "3"],
    ["4", "5", "6"]
  ];
  var d = HD.analyze(grid, []);
  assert.strictEqual(d.headerStart, 0);
  assert.strictEqual(d.headerRows, 1);
});

check("duplicate composed names get suffixes", function () {
  var grid = [
    ["h1", "h1", "h2"],
    ["a", "b", "c"]
  ];
  var t = HD.build(grid, { headerStart: 0, headerRows: 1 });
  assert.deepStrictEqual(t.headers, ["h1", "h1_2", "h2"]);
});

check("empty leaf under group falls back to group name", function () {
  var grid = [
    [null, "groupA", null],
    ["ID", "h1", null],
    ["1", "a", "b"]
  ];
  var t = HD.build(grid, { headerStart: 0, headerRows: 2 });
  assert.deepStrictEqual(t.headers, ["ID", "groupA_h1", "groupA"]);
});

check("build exposes column group paths", function () {
  var grid = [
    [null, "groupA", null, "groupB", null],
    ["ID", "h1", "h2", "h1", "h2"],
    ["1", "a", "b", "c", "d"]
  ];
  var t = HD.build(grid, { headerStart: 0, headerRows: 2 });
  assert.deepStrictEqual(t.groups, [null, "groupA", "groupA", "groupB", "groupB"]);
});

check("single-row header has no group paths", function () {
  var grid = [
    ["name", "age"],
    ["amy", "30"]
  ];
  var t = HD.build(grid, { headerStart: 0, headerRows: 1 });
  assert.deepStrictEqual(t.groups, [null, null]);
});

check("degenerate inputs do not throw", function () {
  assert.deepStrictEqual(HD.analyze([], []), { headerStart: 0, headerRows: 1, confidence: 0 });
  var d = HD.analyze([[null, null], [null, null]], []);
  assert.strictEqual(d.headerStart, 0);
  var t = HD.build([], { headerStart: 0, headerRows: 1 });
  assert.deepStrictEqual(t.headers, []);
  assert.deepStrictEqual(t.rows, []);
});

check("clamps out-of-range options", function () {
  var grid = [
    ["name", "age"],
    ["amy", "30"]
  ];
  var t = HD.build(grid, { headerStart: 99, headerRows: 99 });
  assert.deepStrictEqual(t.headers, ["amy", "30"]);
  assert.deepStrictEqual(t.rows, []);
});

console.log("all " + passed + " tests passed");
