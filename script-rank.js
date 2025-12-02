// script-rank.js
console.log("script-rank.js loaded");

// ----------------------
// 1. SVG + layout
// ----------------------
const rankSvg = d3.select("#rankchart");
const rankWidth = +rankSvg.attr("width");
const rankHeight = +rankSvg.attr("height");

const rankMargin = { top: 50, right: 40, bottom: 40, left: 200 };
const rankInnerWidth = rankWidth - rankMargin.left - rankMargin.right;
const rankInnerHeight = rankHeight - rankMargin.top - rankMargin.bottom;

const rankG = rankSvg.append("g")
  .attr("transform", `translate(${rankMargin.left},${rankMargin.top})`);

const xRank = d3.scaleLinear().range([0, rankInnerWidth]);
const yRank = d3.scaleBand().range([0, rankInnerHeight]).padding(0.15);

const xRankAxisG = rankG.append("g")
  .attr("transform", `translate(0,${rankInnerHeight})`);
const yRankAxisG = rankG.append("g");

// Text that shows the selected bar's value
const rankSelectionText = rankG.append("text")
  .attr("class", "rank-selected-text")
  .attr("x", 0)
  .attr("y", -20)
  .attr("font-size", 12)
  .attr("font-weight", "bold")
  .text("Click a bar to see its value.");

// Axis labels (optional)
rankG.append("text")
  .attr("class", "x-label")
  .attr("x", rankInnerWidth / 2)
  .attr("y", rankInnerHeight + 30)
  .attr("text-anchor", "middle")
  .text("Protein supply in 2022");

rankG.append("text")
  .attr("class", "y-label")
  .attr("x", -10)
  .attr("y", -35)
  .attr("text-anchor", "start")
  .text("Country");

let rankDataAll = [];
let selectedCountry = null;

// ----------------------
// 2. Load FoodSupply.csv
// ----------------------
d3.csv("./FoodSupply.csv").then(data => {
  data.forEach(d => {
    d.country    = d["Area"];
    d.food_group = d["Food Group"];
    d.indicator  = d["Indicator"];
    d.value2022  = d["Y2022"] === "" ? null : +d["Y2022"];
  });

  // keep protein, all food groups, valid values
  rankDataAll = data.filter(d =>
    d.indicator &&
    d.indicator.toLowerCase().includes("protein") &&
    d.food_group === "All food groups" &&
    d.value2022 !== null
  );

  updateRankChart();
}).catch(err => {
  console.error("Error loading CSV for rank chart:", err);
});

// ----------------------
// 3. Draw / update chart
// ----------------------
function updateRankChart() {
  if (rankDataAll.length === 0) return;

  // sort descending
  const sorted = [...rankDataAll].sort((a, b) =>
    d3.descending(a.value2022, b.value2022)
  );

  xRank.domain([0, d3.max(sorted, d => d.value2022) * 1.05]);
  yRank.domain(sorted.map(d => d.country));

  xRankAxisG.call(d3.axisBottom(xRank));
  yRankAxisG.call(d3.axisLeft(yRank));

  const bars = rankG.selectAll("rect.rank-bar")
    .data(sorted, d => d.country);

  bars.exit().remove();

  const barsEnter = bars.enter()
    .append("rect")
    .attr("class", "rank-bar")
    .attr("x", 0)
    .attr("y", d => yRank(d.country))
    .attr("height", yRank.bandwidth())
    .attr("width", 0)
    .attr("fill", "#4682b4")
    .style("cursor", "pointer");

  const barsMerged = barsEnter.merge(bars);

  barsMerged
    .transition()
    .duration(600)
    .attr("y", d => yRank(d.country))
    .attr("height", yRank.bandwidth())
    .attr("width", d => xRank(d.value2022))
    .attr("fill", d =>
      selectedCountry && d.country === selectedCountry
        ? "#2f7f2f"  // highlighted
        : "#4682b4"  // default
    );

  // tooltip on hover (optional)
  barsMerged.select("title").remove();
  barsMerged.append("title")
    .text(d => `${d.country}\nProtein supply 2022: ${d.value2022}`);

  // click to highlight + show value text
  barsMerged.on("click", function (event, d) {
    selectedCountry = d.country;

    // highlight only this bar
    rankG.selectAll("rect.rank-bar")
      .attr("fill", b =>
        b.country === selectedCountry ? "#2f7f2f" : "#4682b4"
      );

    // update the text above the chart with the value
    rankSelectionText.text(
      `${d.country}: Protein supply 2022 = ${d.value2022.toFixed(0)}`
    );
  });
}

