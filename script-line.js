// script-line.js

// ----------------------
// 1. SVG + layout
// ----------------------
const lineSvg = d3.select("#linechart");
const lineWidth = +lineSvg.attr("width");
const lineHeight = +lineSvg.attr("height");

const lineMargin = { top: 40, right: 40, bottom: 60, left: 70 };
const lineInnerWidth = lineWidth - lineMargin.left - lineMargin.right;
const lineInnerHeight = lineHeight - lineMargin.top - lineMargin.bottom;

const lineG = lineSvg.append("g")
    .attr("transform", `translate(${lineMargin.left},${lineMargin.top})`);

const lineCountrySelect = document.getElementById("lineCountry");
const lineIndicatorSelect = document.getElementById("lineIndicator");

const lineXScale = d3.scaleLinear().range([0, lineInnerWidth]);
const lineYScale = d3.scaleLinear().range([lineInnerHeight, 0]);

const lineXAxisG = lineG.append("g")
    .attr("transform", `translate(0,${lineInnerHeight})`);
const lineYAxisG = lineG.append("g");

lineG.append("text")
    .attr("class", "x-label")
    .attr("x", lineInnerWidth / 2)
    .attr("y", lineInnerHeight + 40)
    .attr("text-anchor", "middle")
    .text("Year");

lineG.append("text")
    .attr("class", "y-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -lineInnerHeight / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text("Supply Value");

let lineDataAll = [];
const TOTAL_GROUP = "All food groups";   // same as scatter

// ----------------------
// 2. Load FoodSupply.csv
// ----------------------
d3.csv("FoodSupply.csv").then(data => {
    data.forEach(d => {
        d.country    = d["Area"];
        d.food_group = d["Food Group"];
        d.indicator  = d["Indicator"];

        // parse yearly columns Y2010 ... Y2022
        for (let year = 2010; year <= 2022; year++) {
            const col = "Y" + year;
            d[col] = d[col] === "" ? null : +d[col];
        }
    });

    lineDataAll = data;

    // Use only "All food groups"
    const filtered = lineDataAll.filter(d => d.food_group === TOTAL_GROUP);

    // ---- populate country dropdown ----
    const countries = Array.from(new Set(filtered.map(d => d.country))).sort();
    countries.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        lineCountrySelect.appendChild(opt);
    });

    // ---- populate indicator dropdown ----
    const indicators = Array.from(new Set(filtered.map(d => d.indicator))).sort();
    indicators.forEach(ind => {
        const opt = document.createElement("option");
        opt.value = ind;
        opt.textContent = ind;
        lineIndicatorSelect.appendChild(opt);
    });

    if (countries.length > 0) lineCountrySelect.value = countries[0];
    if (indicators.length > 0) lineIndicatorSelect.value = indicators[0];

    // listeners for dropdown changes
    lineCountrySelect.addEventListener("change", updateLine);
    lineIndicatorSelect.addEventListener("change", updateLine);

    // listen for indicatorChange fired by scatter
    window.addEventListener("indicatorChange", ev => {
        const ind = ev.detail.indicator;
        if (ind && indicators.includes(ind)) {
            lineIndicatorSelect.value = ind;
            updateLine();
        }
    });

    // initial draw
    updateLine();
}).catch(err => {
    console.error("Error loading CSV for line chart:", err);
});

// ----------------------
// 3. Update line chart
// ----------------------
function updateLine() {
    const country = lineCountrySelect.value;
    const indicator = lineIndicatorSelect.value;
    if (!country || !indicator) return;

    // row for this (country, indicator, all food)
    const rows = lineDataAll.filter(d =>
        d.country === country &&
        d.indicator === indicator &&
        d.food_group === TOTAL_GROUP
    );

    if (rows.length === 0) {
        // clear if no data
        lineXScale.domain([2010, 2022]);
        lineYScale.domain([0, 1]);
        lineXAxisG.call(d3.axisBottom(lineXScale).tickFormat(d3.format("d")));
        lineYAxisG.call(d3.axisLeft(lineYScale));
        lineG.selectAll(".line-path").remove();
        lineG.selectAll(".line-point").remove();
        return;
    }

    const row = rows[0];

    // build [{year, value}, ...]
    const series = [];
    for (let year = 2010; year <= 2022; year++) {
        const col = "Y" + year;
        const val = row[col];
        if (val !== null && !isNaN(val)) {
            series.push({ year, value: val });
        }
    }
    if (series.length === 0) return;

    const maxVal = d3.max(series, d => d.value);
    lineXScale.domain(d3.extent(series, d => d.year));
    lineYScale.domain([0, maxVal * 1.1]);

    lineXAxisG.call(d3.axisBottom(lineXScale).tickFormat(d3.format("d")));
    lineYAxisG.call(d3.axisLeft(lineYScale));

    const lineGen = d3.line()
        .x(d => lineXScale(d.year))
        .y(d => lineYScale(d.value));

    // path
    const path = lineG.selectAll(".line-path")
        .data([series]);

    path.enter()
        .append("path")
        .attr("class", "line-path")
        .attr("fill", "none")
        .attr("stroke", "#d62728")
        .attr("stroke-width", 2)
        .merge(path)
        .attr("d", lineGen);

    path.exit().remove();

    // points
    const pts = lineG.selectAll(".line-point")
        .data(series, d => d.year);

    pts.exit().remove();

    const ptsEnter = pts.enter()
        .append("circle")
        .attr("class", "line-point")
        .attr("r", 3)
        .attr("fill", "#d62728");

    const ptsMerged = ptsEnter.merge(pts)
        .attr("cx", d => lineXScale(d.year))
        .attr("cy", d => lineYScale(d.value));

    // tooltips
    ptsMerged.select("title").remove();
    ptsMerged.append("title")
        .text(d => `${country}, ${indicator}\n${d.year}: ${d.value}`);
}

