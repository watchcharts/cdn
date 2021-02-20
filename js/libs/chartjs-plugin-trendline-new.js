/*!
 * chartjs-plugin-trendline.js
 * Version: 0.1.0
 *
 * Copyright 2017 Marcus Alsterfjord
 * Released under the MIT license
 * https://github.com/Makanz/chartjs-plugin-trendline/blob/master/README.md
 */

var pluginTrendlineLinear = {
  beforeDraw: function (chartInstance) {
    if (!chartInstance.chart.options.trendlineLinear) {
      return;
    }

    var xScale = chartInstance.scales["x-axis-1"];
    var yScale = chartInstance.scales["y-axis-1"];

    var fitterData = [];
    var fitterMetaData = [];
    chartInstance.data.datasets.forEach(function (dataset, index) {
      // Just get the first element in the meta array, regardless of key.
      // This is because the key will change based on how many times the dataset
      // has been loaded.
      var metaIndex = Object.keys(dataset._meta)[0];
      if (!dataset._meta[metaIndex].hidden) {
        fitterData = fitterData.concat(dataset.data);
        fitterMetaData = fitterMetaData.concat(
          chartInstance.getDatasetMeta(index).data
        );
      }
    });

    if (fitterData.length > 0 && fitterMetaData.length > 0) {
      addFitter(
        chartInstance.chart,
        fitterMetaData,
        fitterData,
        xScale,
        yScale
      );
    }
  },
};

function addFitter(chart, metaData, data, xScale, yScale) {
  if (data.length < 3) {
    // We can only calculate the quadratic curve if we have at least a starting point, ending point, and middle point
    return;
  }

  // Define style
  var style = chart.options.trendlineLinear.style || "rgba(169,169,169, .6)";
  var lineWidth = chart.options.trendlineLinear.width || 3;
  var lineStyle = chart.options.trendlineLinear.lineStyle || "solid";

  var fitter = new LineFitter();

  // Define vars
  var minX = data
    .reduce(function (prev, curr) {
      return prev.x.valueOf() < curr.x.valueOf() ? prev : curr;
    })
    .x.valueOf();
  var maxX = data
    .reduce(function (prev, curr) {
      return prev.x.valueOf() < curr.x.valueOf() ? curr : prev;
    })
    .x.valueOf();
  var startX = metaData.reduce(function (prev, curr) {
    return prev._model.x < curr._model.x ? prev : curr;
  })._model.x;
  var endX = metaData.reduce(function (prev, curr) {
    return prev._model.x < curr._model.x ? curr : prev;
  })._model.x;

  var range = endX - startX;
  var dataRange = maxX - minX;
  var extension = 0.25;

  // Add points
  if (xScale.options.type === "time" || xScale.options.type === "linear") {
    data.forEach(function (data, index) {
      fitter.add(data.x.valueOf(), data.y);
    });
  } else {
    return;
  }

  chart.ctx.lineWidth = lineWidth;
  if (lineStyle === "dotted") {
    chart.ctx.setLineDash([2, 3]);
  }

  chart.ctx.beginPath();

  for (var x = startX - range * extension; x <= endX + range * extension; x++) {
    var fitterX = minX + ((x - startX) / range) * dataRange;
    var y = yScale.getPixelForValue(fitter.project(fitterX));
    chart.ctx.lineTo(x, y);
  }

  chart.ctx.strokeStyle = style;
  chart.ctx.stroke();
}

Chart.plugins.register(pluginTrendlineLinear);

function LineFitter() {
  this.count = 0;
  this.sumX = 0;
  this.sumX2 = 0;
  this.sumXY = 0;
  this.sumY = 0;
}

LineFitter.prototype = {
  add: function (x, y) {
    y = Math.log(y);
    this.count++;
    this.sumX += x;
    this.sumX2 += x * x;
    this.sumXY += x * y;
    this.sumY += y;
  },
  project: function (x) {
    this.det = this.count * this.sumX2 - this.sumX * this.sumX;
    this.m = (this.count * this.sumXY - this.sumX * this.sumY) / this.det;
    this.b = (this.sumX2 * this.sumY - this.sumX * this.sumXY) / this.det;
    this.r = Math.pow(Math.E, this.m);
    this.A = Math.pow(Math.E, this.b);
    return this.A * Math.pow(this.r, x);
  },
};
