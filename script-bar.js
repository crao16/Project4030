// script-bar.js

//SVG + layout
const barSvg = d3.select("#barchart");
const barWidth = +barSvg.attr("width");
const barHeight = +barSvg.attr("height");

const barMargin = { top: 40, right: 40, bottom: 80, left: 80 };
const barInnerWidth = barWidth - barMargin.left - barMargin.right;
const barInnerHeight = barHeight - barMargin.top - barMargin.bottom;

const barG = barSvg.append("g")
    .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

const barCountrySelect = document.getElementById("barCountry");

const xBar = d3.scaleBand().range([0, barInnerWidth]).padding(0.2);
const yBar = d3.scaleLinear().range([barInnerHeight, 0]);

const xBarAxisG = barG.append("g")
    .attr("transform", `translate(0,${barInnerHeight})`);
const yBarAxisG = barG.append("g");

barG.append("text")
    .attr("class", "x-label")
    .attr("x", barInnerWidth / 2)
    .attr("y", barInnerHeight + 50)
    .attr("text-anchor", "middle")
    .text("Food Group");

barG.append("text")
    .attr("class", "y-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -barInnerHeight / 2)
    .attr("y", -60)
    .attr("text-anchor", "middle")
    .text("Protein Supply (2022)");

// tweak this string to match EXACTLY the protein indicator text in your CSV
const PROTEIN_INDICATOR = "Protein supply (g/capita/day)";
const TARGET_YEAR_COL = "Y2022";

let barDataAll = [];

// ----------------------
// 2. Load FoodSupply.csv
// ----------------------
d3.csv("FoodSupply.csv").then(data => {
    data.forEach(d => {
        d.country    = d["Area"];
        d.food_group = d["Food Group"];
        d.indicator  = d["Indicator"];
        // parse 2022 value (you can change to Y2020/2021 if needed)
        d.value2022  = d[TARGET_YEAR_COL] === "" ? null : +d[TARGET_YEAR_COL];
    });

    barDataAll = data;

    // filter to protein rows with non-null 2022
    const proteinRows = barDataAll.filter(d =>
        d.indicator === PROTEIN_INDICATOR &&
        d.value2022 !== null
    );

    // populate country dropdown
    const countries = Array.from(new Set(proteinRows.map(d => d.country))).sort();
    countries.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        barCountrySelect.appendChild(opt);
    });

    if (countries.length > 0) {
        barCountrySelect.value = countries[0];
    }

    // listener
    barCountrySelect.addEventListener("change", updateBar);

    // initial draw
    updateBar();
}).catch(err => {
    console.error("Error loading CSV for bar chart:", err);
});

// ----------------------
// 3. Update bar chart
// ----------------------
function updateBar() {
    const country = barCountrySelect.value;
    if (!country) return;

    // subset: this country, protein indicator, non-null 2022, ignore "All food groups"
    const subset = barDataAll.filter(d =>
        d.country === country &&
        d.indicator === PROTEIN_INDICATOR &&
        d.value2022 !== null &&
        d.food_group !== "All food groups"
    );

    if (subset.length === 0) {
        // clear axes and bars if no data
        xBar.domain([]);
        yBar.domain([0, 1]);
        xBarAxisG.call(d3.axisBottom(xBar));
        yBarAxisG.call(d3.axisLeft(yBar));
        barG.selectAll("rect.bar").remove();
        return;
    }

    // x domain: food groups
    xBar.domain(subset.map(d => d.food_group));

    // y domain: 0 .. max value
    const maxVal = d3.max(subset, d => d.value2022);
    yBar.domain([0, maxVal * 1.1]);

    // x-axis with rotated labels
    xBarAxisG.call(d3.axisBottom(xBar))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end");

    // y-axis
    yBarAxisG.call(d3.axisLeft(yBar));

    // join
    const bars = barG.selectAll("rect.bar")
        .data(subset, d => d.food_group);

    // exit
    bars.exit().remove();

    // enter
    const barsEnter = bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xBar(d.food_group))
        .attr("width", xBar.bandwidth())
        .attr("y", barInnerHeight)
        .attr("height", 0)
        .attr("fill", "#2ca02c");

    // update + enter
    barsEnter.merge(bars)
        .transition()
        .duration(600)
        .attr("x", d => xBar(d.food_group))
        .attr("width", xBar.bandwidth())
        .attr("y", d => yBar(d.value2022))
        .attr("height", d => barInnerHeight - yBar(d.value2022));

    // tooltips
    const allBars = barG.selectAll("rect.bar");
    allBars.select("title").remove();
    allBars.append("title")
        .text(d => `${country}\n${d.food_group}\nProtein (2022): ${d.value2022}`);
}
