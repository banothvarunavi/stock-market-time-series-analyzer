"use strict";

const csvFile = document.getElementById("csvFile");
const fileStatus = document.getElementById("fileStatus");

const latestClose = document.getElementById("latestClose");
const highestClose = document.getElementById("highestClose");
const lowestClose = document.getElementById("lowestClose");
const periodReturn = document.getElementById("periodReturn");

const chartCanvas = document.getElementById("stockChart");
const chartPlaceholder = document.getElementById("chartPlaceholder");
const chartRange = document.getElementById("chartRange");

const stockTableBody = document.getElementById("stockTableBody");
const recordCount = document.getElementById("recordCount");
const downloadBtn = document.getElementById("downloadBtn");

let stockData = [];
let stockChart = null;
let originalCSV = "";

// Convert column names into a consistent format.
function normaliseHeader(header) {
    return header
        .replace(/^\uFEFF/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

// Read CSV properly, including fields enclosed in quotation marks.
function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let insideQuotes = false;

    text = text.replace(/^\uFEFF/, "");

    for (let i = 0; i < text.length; i++) {
        const character = text[i];

        if (character === '"') {
            if (insideQuotes && text[i + 1] === '"') {
                field += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (character === "," && !insideQuotes) {
            row.push(field.trim());
            field = "";
        } else if (
            (character === "\n" || character === "\r") &&
            !insideQuotes
        ) {
            if (character === "\r" && text[i + 1] === "\n") {
                i++;
            }

            row.push(field.trim());

            if (row.some(value => value !== "")) {
                rows.push(row);
            }

            row = [];
            field = "";
        } else {
            field += character;
        }
    }

    row.push(field.trim());

    if (row.some(value => value !== "")) {
        rows.push(row);
    }

    return rows;
}

// Convert a price or volume value into a number.
function toNumber(value) {
    if (value === undefined || value === null || value.trim() === "") {
        return NaN;
    }

    const cleaned = value.replace(/[$,\s]/g, "");
    const number = Number(cleaned);

    return Number.isFinite(number) ? number : NaN;
}

// Find the position of a column by its possible names.
function findColumn(headers, possibleNames) {
    for (const name of possibleNames) {
        const index = headers.indexOf(name);

        if (index !== -1) {
            return index;
        }
    }

    return -1;
}

// Convert CSV rows into stock records.
function readStockData(csvText) {
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
        throw new Error("The CSV file contains no data rows.");
    }

    const headers = rows[0].map(normaliseHeader);

    const dateIndex = findColumn(headers, [
        "date",
        "converteddate",
        "datetime",
        "timestamp"
    ]);

    const closeIndex = findColumn(headers, [
        "close",
        "adjclose",
        "closingprice",
        "closing"
    ]);

    if (dateIndex === -1 || closeIndex === -1) {
        throw new Error(
            "Could not find Date and Close columns. Please check your CSV headers."
        );
    }

    const openIndex = findColumn(headers, ["open", "openingprice"]);
    const highIndex = findColumn(headers, ["high", "highestprice"]);
    const lowIndex = findColumn(headers, ["low", "lowestprice"]);
    const volumeIndex = findColumn(headers, ["volume", "totalvolume"]);

    const records = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        const dateText = row[dateIndex] || "";
        const close = toNumber(row[closeIndex]);
        const date = new Date(dateText);

        if (
            !dateText ||
            Number.isNaN(date.getTime()) ||
            !Number.isFinite(close)
        ) {
            continue;
        }

        records.push({
            date: date,
            dateText: dateText,
            open: openIndex === -1 ? NaN : toNumber(row[openIndex]),
            high: highIndex === -1 ? NaN : toNumber(row[highIndex]),
            low: lowIndex === -1 ? NaN : toNumber(row[lowIndex]),
            close: close,
            volume: volumeIndex === -1 ? "" : row[volumeIndex]
        });
    }

    if (records.length === 0) {
        throw new Error(
            "No valid stock records were found. Check your dates and closing prices."
        );
    }

    // Sort dates from oldest to newest.
    records.sort((a, b) => a.date - b.date);

    return records;
}

// Calculate the Simple Moving Average.
function calculateSMA(records, period = 20) {
    return records.map((record, index) => {
        if (index < period - 1) {
            return null;
        }

        const recentRecords = records.slice(
            index - period + 1,
            index + 1
        );

        const total = recentRecords.reduce(
            (sum, item) => sum + item.close,
            0
        );

        return total / period;
    });
}

// Calculate the Exponential Moving Average.
function calculateEMA(records, period = 20) {
    const result = [];
    const multiplier = 2 / (period + 1);

    let ema = records[0].close;

    records.forEach((record, index) => {
        if (index === 0) {
            ema = record.close;
        } else {
            ema =
                record.close * multiplier +
                ema * (1 - multiplier);
        }

        result.push(ema);
    });

    return result;
}

// Format numbers for the dashboard.
function formatPrice(value) {
    return Number(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Format dates consistently.
function formatDate(date) {
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

// Update the four summary cards.
function updateStatistics(records) {
    const first = records[0].close;
    const last = records[records.length - 1].close;

    const highest = Math.max(...records.map(item => item.close));
    const lowest = Math.min(...records.map(item => item.close));

    const change = first !== 0
        ? ((last - first) / first) * 100
        : NaN;

    latestClose.textContent = formatPrice(last);
    highestClose.textContent = formatPrice(highest);
    lowestClose.textContent = formatPrice(lowest);

    periodReturn.textContent = Number.isFinite(change)
        ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`
        : "N/A";

    periodReturn.style.color =
        change > 0 ? "#16865c" :
        change < 0 ? "#d14343" :
        "";
}

// Display the stock records in the table.
function updateTable(records) {
    const visibleRecords = records.slice(-20).reverse();

    stockTableBody.innerHTML = "";

    visibleRecords.forEach(record => {
        const row = document.createElement("tr");

        const values = [
            formatDate(record.date),
            Number.isFinite(record.open) ? formatPrice(record.open) : "—",
            Number.isFinite(record.high) ? formatPrice(record.high) : "—",
            Number.isFinite(record.low) ? formatPrice(record.low) : "—",
            formatPrice(record.close),
            record.volume || "—"
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        stockTableBody.appendChild(row);
    });

    recordCount.textContent =
        `${records.length.toLocaleString("en-IN")} records loaded. Showing the latest ${visibleRecords.length}.`;
}

// Show the chart and its moving averages.
function updateChart() {
    if (typeof Chart === "undefined") {
        fileStatus.textContent =
            "CSV loaded, but the chart library could not load. Check your internet connection.";
        return;
    }

    let records = [...stockData];

    const days = chartRange.value;

    if (days !== "all") {
        const latestDate = records[records.length - 1].date;

        const cutoff = new Date(latestDate);
        cutoff.setDate(cutoff.getDate() - Number(days));

        records = records.filter(record => record.date >= cutoff);
    }

    if (records.length === 0) {
        return;
    }

    const sma = calculateSMA(records);
    const ema = calculateEMA(records);

    const labels = records.map(record => formatDate(record.date));

    const datasets = [
        {
            label: "Closing Price",
            data: records.map(record => record.close),
            borderColor: "#2449a5",
            backgroundColor: "rgba(36, 73, 165, 0.10)",
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.2,
            fill: true
        },
        {
            label: "SMA (20)",
            data: sma,
            borderColor: "#e5a23b",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.2,
            fill: false,
            spanGaps: false
        },
        {
            label: "EMA (20)",
            data: ema,
            borderColor: "#159b83",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.2,
            fill: false
        }
    ];

    if (stockChart) {
        stockChart.destroy();
    }

    chartPlaceholder.style.display = "none";

    stockChart = new Chart(chartCanvas, {
        type: "line",

        data: {
            labels: labels,
            datasets: datasets
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                mode: "index",
                intersect: false
            },

            plugins: {
                legend: {
                    display: true,
                    position: "bottom"
                },

                tooltip: {
                    enabled: true
                }
            },

            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: 8,
                        maxRotation: 0
                    },

                    grid: {
                        display: false
                    }
                },

                y: {
                    beginAtZero: false,

                    title: {
                        display: true,
                        text: "Closing Price"
                    }
                }
            }
        }
    });
}

// Load and analyse a selected CSV file.
csvFile.addEventListener("change", event => {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
        fileStatus.textContent = "Please choose a CSV file.";
        return;
    }

    fileStatus.textContent = "Reading file...";

    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            originalCSV = e.target.result;

            stockData = readStockData(originalCSV);

            updateStatistics(stockData);
            updateTable(stockData);
            updateChart();

            downloadBtn.disabled = false;

            fileStatus.textContent =
                `${file.name} · ${stockData.length.toLocaleString("en-IN")} records loaded`;
        } catch (error) {
            console.error(error);
            fileStatus.textContent = error.message;
        }
    };

    reader.onerror = function () {
        fileStatus.textContent = "Unable to read the selected file.";
    };

    reader.readAsText(file);
});

// Refresh the chart when the date range changes.
chartRange.addEventListener("change", () => {
    if (stockData.length > 0) {
        updateChart();
    }
});

// Download the original CSV file.
downloadBtn.addEventListener("click", () => {
    if (!originalCSV) {
        return;
    }

    const blob = new Blob([originalCSV], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "stock_analysis_data.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
});

