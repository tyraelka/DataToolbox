"use strict";
  App.Charts = (function () {
    var registry = {};
    var factories = {};
    function destroy(id) {
      if (registry[id]) registry[id].destroy();
      delete registry[id];
    }
    function make(id, factory) {
      factories[id] = factory;
      destroy(id);
      var canvas = document.getElementById(id);
      if (!canvas || typeof Chart === "undefined") return null;
      registry[id] = new Chart(canvas, factory());
      return registry[id];
    }
    function chartOptions(extra) {
      extra = extra || {};
      return Object.assign({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: cssVar("--text") } },
          title: { color: cssVar("--text") }
        },
        scales: {
          x: { ticks: { color: cssVar("--text-muted") }, grid: { color: cssVar("--border") } },
          y: { ticks: { color: cssVar("--text-muted") }, grid: { color: cssVar("--border") } }
        }
      }, extra);
    }
    function bar(id, labels, values, options) {
      options = options || {};
      return make(id, function () {
        return {
          type: "bar",
          data: { labels: labels, datasets: [{ label: options.label || "", data: values, backgroundColor: options.colors || cssVar("--accent") }] },
          options: chartOptions({ indexAxis: options.horizontal ? "y" : "x", plugins: { legend: { display: !!options.label, labels: { color: cssVar("--text") } } } })
        };
      });
    }
    function pie(id, labels, values) {
      return make(id, function () {
        return {
          type: "pie",
          data: { labels: labels, datasets: [{ data: values, backgroundColor: palette(labels.length) }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: cssVar("--text") } } } }
        };
      });
    }
    function palette(n) {
      var base = [
        cssVar("--chart-1"),
        cssVar("--chart-2"),
        cssVar("--chart-3"),
        cssVar("--chart-4"),
        cssVar("--chart-5"),
        cssVar("--chart-6"),
        cssVar("--chart-7"),
        cssVar("--chart-8")
      ];
      var out = [];
      for (var i = 0; i < n; i++) out.push(base[i % base.length]);
      return out;
    }
    document.addEventListener("themechange", function () {
      Object.keys(factories).forEach(function (id) { make(id, factories[id]); });
    });
    return { bar: bar, pie: pie, destroy: destroy };
  })();

