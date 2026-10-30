let stockData = [];
let stockChart = null;
let macdChart = null;

const csvInput = document.getElementById("csvFile");
const rangeSelector = document.getElementById("chartRange");

/* =================================
   1. CSV PARSING
================================= */

function parseCSVLine(line) {
    const result = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (insideQuotes && line[i + 1] === '"') {
                value += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === "," && !insideQuotes) {
            result.push(value.trim());
            value = "";
        } else {
            value += char;
        }
    }

    result.push(value.trim());
    return result;
}

function normalizeHeader(header) {
    return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumn(headers, possibleNames) {
    for (const name of possibleNames) {
        const index = headers.findIndex(
            header => normalizeHeader(header) === name
        );

        if (index !== -1) {
            return index;
        }
    }

    return -1;
}

function numberValue(value) {
    const cleaned = String(value ?? "").replace(/,/g, "").trim();

    if (cleaned === "" || cleaned === "-") {
        return NaN;
    }

    const number = Number(cleaned);

    return Number.isFinite(number) ? number : NaN;
}

/* =================================
   2. LOAD CSV FILE
================================= */

function loadCSV(text) {
    const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);

    if (lines.length < 2) {
        alert("CSV file does not contain enough data.");
        return;
    }

    const headers = parseCSVLine(lines[0]);

    const dateIndex = findColumn(headers, [
        "date",
        "converteddate",
        "datetime",
        "timestamp"
    ]);

    const openIndex = findColumn(headers, ["open"]);
    const highIndex = findColumn(headers, ["high"]);
    const lowIndex = findColumn(headers, ["low"]);

    const closeIndex = findColumn(headers, [
        "close",
        "adjclose",
        "closingprice",
        "closing"
    ]);

    const volumeIndex = findColumn(headers, ["volume"]);

    if (dateIndex === -1 || closeIndex === -1) {
        alert("Date or Close column not found in CSV file.");
        return;
    }

    const parsedData = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) {
            continue;
        }

        const row = parseCSVLine(lines[i]);

        const date = row[dateIndex];
        const close = numberValue(row[closeIndex]);

        if (!date || !Number.isFinite(close)) {
            continue;
        }

        parsedData.push({
            date: date,

            open: openIndex !== -1
                ? numberValue(row[openIndex])
                : NaN,

            high: highIndex !== -1
                ? numberValue(row[highIndex])
                : NaN,

            low: lowIndex !== -1
                ? numberValue(row[lowIndex])
                : NaN,

            close: close,

            volume: volumeIndex !== -1
                ? numberValue(row[volumeIndex])
                : NaN
        });
    }

    if (parsedData.length === 0) {
        alert("No valid stock records found.");
        return;
    }

    parsedData.sort((a, b) => {
        const dateA = Date.parse(a.date);
        const dateB = Date.parse(b.date);

        if (Number.isFinite(dateA) && Number.isFinite(dateB)) {
            return dateA - dateB;
        }

        return a.date.localeCompare(b.date);
    });

    stockData = parsedData;

    updateDashboard();
    updatePriceChart();
    updateMACD();
    updateBreakouts();
    updateStockTable();

    alert(
        "CSV loaded successfully!\n" +
        stockData.length +
        " stock records loaded."
    );
}

/* =================================
   3. EMA CALCULATION
================================= */

function calculateEMA(values, period) {
    const result = [];

    const multiplier = 2 / (period + 1);

    let previousEMA = null;

    values.forEach(value => {
        if (!Number.isFinite(value)) {
            result.push(null);
            return;
        }

        if (previousEMA === null) {
            previousEMA = value;
        } else {
            previousEMA =
                (value - previousEMA) * multiplier + previousEMA;
        }

        result.push(previousEMA);
    });

    return result;
}

/* =================================
   4. SMA CALCULATION
================================= */

function calculateSMA(values, period) {
    return values.map((value, index) => {
        if (index < period - 1) {
            return null;
        }

        const window = values.slice(
            index - period + 1,
            index + 1
        );

        if (window.some(item => !Number.isFinite(item))) {
            return null;
        }

        const sum = window.reduce(
            (total, item) => total + item,
            0
        );

        return sum / period;
    });
}

/* =================================
   5. DASHBOARD SUMMARY
================================= */

function updateDashboard() {
    if (stockData.length === 0) {
        return;
    }

    const closes = stockData.map(item => item.close);

    const latest = closes[closes.length - 1];
    const highest = Math.max(...closes);
    const lowest = Math.min(...closes);
    const first = closes[0];

    const periodReturn = first !== 0
        ? ((latest - first) / first) * 100
        : 0;

    document.getElementById("latestClose").textContent =
        latest.toFixed(2);

    document.getElementById("highestClose").textContent =
        highest.toFixed(2);

    document.getElementById("lowestClose").textContent =
        lowest.toFixed(2);

    document.getElementById("periodReturn").textContent =
        periodReturn.toFixed(2) + "%";
}

/* =================================
   6. CHART RANGE
================================= */

function getVisibleStartIndex() {
    const range = rangeSelector.value;

    if (range === "all") {
        return 0;
    }

    const count = Number(range);

    return Math.max(0, stockData.length - count);
}

/* =================================
   7. PRICE ANALYSIS CHART
================================= */

function updatePriceChart() {
    if (stockData.length === 0) {
        return;
    }

    const closes = stockData.map(item => item.close);

    const sma = calculateSMA(closes, 20);
    const ema = calculateEMA(closes, 20);

    const startIndex = getVisibleStartIndex();

    const labels = stockData
        .slice(startIndex)
        .map(item => item.date);

    const visibleClose = closes.slice(startIndex);
    const visibleSMA = sma.slice(startIndex);
    const visibleEMA = ema.slice(startIndex);

    const ctx = document.getElementById("stockChart");

    if (stockChart) {
        stockChart.destroy();
    }

    stockChart = new Chart(ctx, {
        type: "line",

        data: {
            labels: labels,

            datasets: [
                {
                    label: "Closing Price",

                    data: visibleClose,

                    borderColor: "#1d4ed8",
                    backgroundColor: "rgba(29,78,216,0.08)",

                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.2
                },

                {
                    label: "SMA (20)",

                    data: visibleSMA,

                    borderColor: "#16a34a",
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.2
                },

                {
                    label: "EMA (20)",

                    data: visibleEMA,

                    borderColor: "#f59e0b",
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.2
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                intersect: false,
                mode: "index"
            },

            plugins: {
                legend: {
                    position: "bottom"
                }
            },

            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: 10
                    }
                }
            }
        }
    });
}

/* =================================
   8. MACD CALCULATION
================================= */

function updateMACD() {
    if (stockData.length === 0) {
        return;
    }

    const closes = stockData.map(item => item.close);

    // Calculate 12-day EMA
    const ema12 = calculateEMA(closes, 12);

    // Calculate 26-day EMA
    const ema26 = calculateEMA(closes, 26);

    // MACD = EMA(12) - EMA(26)
    const macdLine = ema12.map((value, index) => {
        return value - ema26[index];
    });

    // Signal line = 9-day EMA of MACD
    const signalLine = calculateEMA(macdLine, 9);

    // Histogram = MACD - Signal
    const histogram = macdLine.map((value, index) => {
        return value - signalLine[index];
    });

    const lastIndex = stockData.length - 1;

    document.getElementById("latestMACD").textContent =
        macdLine[lastIndex].toFixed(4);

    document.getElementById("latestSignal").textContent =
        signalLine[lastIndex].toFixed(4);

    document.getElementById("latestHistogram").textContent =
        histogram[lastIndex].toFixed(4);

    const startIndex = getVisibleStartIndex();

    const labels = stockData
        .slice(startIndex)
        .map(item => item.date);

    const visibleMACD = macdLine.slice(startIndex);
    const visibleSignal = signalLine.slice(startIndex);
    const visibleHistogram = histogram.slice(startIndex);

    const ctx = document.getElementById("macdChart");

    if (macdChart) {
        macdChart.destroy();
    }

    macdChart = new Chart(ctx, {
        type: "bar",

        data: {
            labels: labels,

            datasets: [
                {
                    type: "line",

                    label: "MACD Line",

                    data: visibleMACD,

                    borderColor: "#1d4ed8",
                    borderWidth: 2,

                    pointRadius: 0,
                    tension: 0.2
                },

                {
                    type: "line",

                    label: "Signal Line",

                    data: visibleSignal,

                    borderColor: "#f59e0b",
                    borderWidth: 2,

                    pointRadius: 0,
                    tension: 0.2
                },

                {
                    type: "bar",

                    label: "Histogram",

                    data: visibleHistogram,

                    backgroundColor: visibleHistogram.map(value => {
                        return value >= 0 ? "#16a34a" : "#dc2626";
                    })
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                intersect: false,
                mode: "index"
            },

            plugins: {
                legend: {
                    position: "bottom"
                }
            },

            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: 10
                    }
                }
            }
        }
    });
}

/* =================================
   9. BREAKOUT DETECTION
================================= */

function updateBreakouts() {
    if (stockData.length === 0) {
        return;
    }

    const signals = [];

    // Start after 20 previous trading records
    for (let i = 20; i < stockData.length; i++) {

        // Get previous 20 records
        const previousRecords = stockData.slice(i - 20, i);

        // Find the highest price in those records
        const previousHighs = previousRecords.map(item => {
            return Number.isFinite(item.high)
                ? item.high
                : item.close;
        });

        const previous20DayHigh = Math.max(...previousHighs);

        // Current day's closing price
        const currentClose = stockData[i].close;

        // Check for bullish breakout
        if (currentClose > previous20DayHigh) {
            signals.push({
                date: stockData[i].date,
                close: currentClose,
                previousHigh: previous20DayHigh
            });
        }
    }

    // Update total breakout count
    document.getElementById("bullishCount").textContent =
        signals.length;

    // Update latest breakout date
    document.getElementById("latestBreakout").textContent =
        signals.length > 0
            ? signals[signals.length - 1].date
            : "No signal";

    // Display breakout table
    const tbody = document.getElementById("breakoutTableBody");

    if (signals.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-table">
                    No bullish breakouts detected.
                </td>
            </tr>
        `;

        return;
    }

    // Show latest 20 breakout records
    const recentSignals = signals.slice(-20).reverse();

    tbody.innerHTML = recentSignals.map(signal => `
        <tr>
            <td>${escapeHTML(signal.date)}</td>

            <td>${signal.close.toFixed(2)}</td>

            <td>${signal.previousHigh.toFixed(2)}</td>

            <td class="breakout-positive">
                Bullish Breakout
            </td>
        </tr>
    `).join("");
}

/* =================================
   10. STOCK DATA TABLE
================================= */

function updateStockTable() {
    const tbody = document.getElementById("stockTableBody");

    // Display latest 20 records
    const recentRecords = stockData.slice(-20).reverse();

    tbody.innerHTML = recentRecords.map(item => `
        <tr>
            <td>${escapeHTML(item.date)}</td>

            <td>${formatNumber(item.open)}</td>

            <td>${formatNumber(item.high)}</td>

            <td>${formatNumber(item.low)}</td>

            <td>${formatNumber(item.close)}</td>

            <td>${formatNumber(item.volume)}</td>
        </tr>
    `).join("");

    document.getElementById("recordCount").textContent =
        stockData.length + " records";
}

/* =================================
   11. NUMBER FORMATTING
================================= */

function formatNumber(value) {
    if (!Number.isFinite(value)) {
        return "—";
    }

    return value.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

/* =================================
   12. HTML ESCAPING
================================= */

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => {
        const replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return replacements[character];
    });
}

/* =================================
   13. DOWNLOAD CSV
================================= */

function csvEscape(value) {
    const text = String(value ?? "");

    return '"' + text.replace(/"/g, '""') + '"';
}

document.getElementById("downloadBtn").addEventListener("click", () => {

    if (stockData.length === 0) {
        alert("Please upload stock data first.");
        return;
    }

    const rows = [];

    rows.push([
        "Date",
        "Open",
        "High",
        "Low",
        "Close",
        "Volume"
    ].join(","));

    stockData.forEach(item => {
        rows.push([
            item.date,
            item.open,
            item.high,
            item.low,
            item.close,
            item.volume
        ].map(csvEscape).join(","));
    });

    const csv = rows.join("\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "stock_analysis_data.csv";

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
});

/* =================================
   14. CSV UPLOAD EVENT
================================= */

csvInput.addEventListener("change", event => {

    const file = event.target.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            loadCSV(e.target.result);
        } catch (error) {
            console.error("CSV loading error:", error);
            alert("An error occurred while processing the CSV file.");
        }
    };

    reader.onerror = function() {
        alert("Unable to read the selected CSV file.");
    };

    reader.readAsText(file);
});

/* =================================
   15. CHART RANGE EVENT
================================= */

rangeSelector.addEventListener("change", () => {

    if (stockData.length === 0) {
        return;
    }

    updatePriceChart();
    updateMACD();
});

