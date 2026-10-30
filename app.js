?variant="standard" id="62843" title="Complete app.js"}
```javascript
let stockData = [];
let stockChart = null;
let macdChart = null;

const csvInput = document.getElementById("csvFile");
const rangeSelector = document.getElementById("chartRange");

/* ---------------- CSV PARSER ---------------- */

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

        if (index !== -1) return index;
    }

    return -1;
}

function numberValue(value) {
    const cleaned = String(value ?? "").replace(/,/g, "").trim();

    if (!cleaned || cleaned === "-") return NaN;

    const number = Number(cleaned);
    return Number.isFinite(number) ? number : NaN;
}

function loadCSV(text) {
    const lines = text.trim().split(/\r?\n/);

    if (lines.length < 2) {
        alert("The CSV file does not contain enough data.");
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

    let closeIndex = findColumn(headers, [
        "close",
        "adjclose",
        "closingprice",
        "closing"
    ]);

    const volumeIndex = findColumn(headers, ["volume"]);

    if (dateIndex === -1 || closeIndex === -1) {
        alert("Could not identify the Date and Close columns in this CSV.");
        return;
    }

    const parsed = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const row = parseCSVLine(lines[i]);

        const date = row[dateIndex];
        const close = numberValue(row[closeIndex]);

        if (!date || !Number.isFinite(close)) continue;

        parsed.push({
            date: date,
            open: openIndex !== -1
                ? numberValue(row[openIndex]) : NaN,
            high: highIndex !== -1
                ? numberValue(row[highIndex]) : NaN,
            low: lowIndex !== -1
                ? numberValue(row[lowIndex]) : NaN,
            close: close,
            volume: volumeIndex !== -1
                ? numberValue(row[volumeIndex]) : NaN
        });
    }

    if (parsed.length === 0) {
        alert("No valid stock records were found.");
        return;
    }

    parsed.sort((a, b) => {
        const dateA = Date.parse(a.date);
        const dateB = Date.parse(b.date);

        if (Number.isFinite(dateA) && Number.isFinite(dateB)) {
            return dateA - dateB;
        }

        return a.date.localeCompare(b.date);
    });

    stockData = parsed;

    updateDashboard();
    updatePriceChart();
    updateMACD();
    updateBreakouts();
    updateStockTable();

    alert("CSV loaded successfully! " + stockData.length + " records found.");
}

/* ---------------- EMA CALCULATION ---------------- */

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

/* ---------------- SMA CALCULATION ---------------- */

function calculateSMA(values, period) {
    return values.map((value, index) => {
        if (index < period - 1) return null;

        const window = values.slice(index - period + 1, index + 1);

        if (window.some(item => !Number.isFinite(item))) {
            return null;
        }

        const total = window.reduce((sum, item) => sum + item, 0);

        return total / period;
    });
}

/* ---------------- DASHBOARD SUMMARY ---------------- */

function updateDashboard() {
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

/* ---------------- CHART RANGE ---------------- */

function getVisibleData(data) {
    const range = rangeSelector.value;

    if (range === "all") return data;

    const count = Number(range);

    return data.slice(-count);
}

/* ---------------- PRICE CHART ---------------- */

function updatePriceChart() {
    const closes = stockData.map(item => item.close);

    const sma = calculateSMA(closes, 20);
    const ema = calculateEMA(closes, 20);

    const labels = stockData.map(item => item.date);

    const visible = getVisibleData(stockData);
    const startIndex = stockData.length - visible.length;

    const visibleLabels = labels.slice(startIndex);

    const visibleClose = closes.slice(startIndex);
    const visibleSMA = sma.slice(startIndex);
    const visibleEMA = ema.slice(startIndex);

    const ctx = document.getElementById("stockChart");

    if (stockChart) stockChart.destroy();

    stockChart = new Chart(ctx, {
        type: "line",

        data: {
            labels: visibleLabels,

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

/* ---------------- MACD CALCULATION ---------------- */

function updateMACD() {
    const closes = stockData.map(item => item.close);

    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);

    const macdLine = ema12.map((value, index) => {
        return value - ema26[index];
    });

    const signalLine = calculateEMA(macdLine, 9);

    const histogram = macdLine.map((value, index) => {
        return value - signalLine[index];
    });

    const lastIndex = closes.length - 1;

    document.getElementById("latestMACD").textContent =
        macdLine[lastIndex].toFixed(4);

    document.getElementById("latestSignal").textContent =
        signalLine[lastIndex].toFixed(4);

    document.getElementById("latestHistogram").textContent =
        histogram[lastIndex].toFixed(4);

    const visible = getVisibleData(stockData);
    const startIndex = stockData.length - visible.length;

    const labels = stockData
        .slice(startIndex)
        .map(item => item.date);

    const visibleMACD = macdLine.slice(startIndex);
    const visibleSignal = signalLine.slice(startIndex);
    const visibleHistogram = histogram.slice(startIndex);

    const ctx = document.getElementById("macdChart");

    if (macdChart) macdChart.destroy();

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
                    backgroundColor: visibleHistogram.map(value =>
                        value >= 0 ? "#16a34a" : "#dc2626"
                    )
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

/* ---------------- BREAKOUT DETECTION ---------------- */

function updateBreakouts() {
    const signals = [];

    for (let i = 20; i < stockData.length; i++) {

        const previousRecords = stockData.slice(i - 20, i);

        const previousHighs = previousRecords.map(item => {
            return Number.isFinite(item.high)
                ? item.high
                : item.close;
        });

        const previous20DayHigh = Math.max(...previousHighs);

        const currentClose = stockData[i].close;

        if (currentClose > previous20DayHigh) {
            signals.push({
                date: stockData[i].date,
                close: currentClose,
                previousHigh: previous20DayHigh
            });
        }
    }

    document.getElementById("bullishCount").textContent =
        signals.length;

    document.getElementById("latestBreakout").textContent =
        signals.length > 0
            ? signals[signals.length - 1].date
            : "No signal";

    const tbody = document.getElementById("breakoutTableBody");

    if (signals.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-table">
                    No bullish breakouts detected in the uploaded data.
                </td>
            </tr>
        `;
        return;
    }

    const recentSignals = signals.slice(-20).reverse();

    tbody.innerHTML = recentSignals.map(signal => `
        <tr>
            <td>${escapeHTML(signal.date)}</td>
            <td>${signal.close.toFixed(2)}</td>
            <td>${signal.previousHigh.toFixed(2)}</td>
            <td class="breakout-positive">Bullish Breakout</td>
        </tr>
    `).join("");
}

/* ---------------- STOCK TABLE ---------------- */

function updateStockTable() {
    const tbody = document.getElementById("stockTableBody");

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

function formatNumber(value) {
    return Number.isFinite(value) ? value.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    }) : "—";
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

/* ---------------- CSV DOWNLOAD ---------------- */

document.getElementById("downloadBtn").addEventListener("click", () => {
    if (stockData.length === 0) {
        alert("Please upload stock data first.");
        return;
    }

    const csv = [
        ["Date", "Open", "High", "Low", "Close", "Volume"].join(","),

        ...stockData.map(item => [
            item.date,
            item.open,
            item.high,
            item.low,
            item.close,
            item.volume
        ].join(","))
    ].join("\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "stock_analysis_data.csv";
    link.click();

    URL.revokeObjectURL(url);
});

/* ---------------- EVENT LISTENERS ---------------- */

csvInput.addEventListener("change", event => {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        loadCSV(e.target.result);
    };

    reader.onerror = function() {
        alert("Unable to read the selected CSV file.");
    };

    reader.readAsText(file);
});

rangeSelector.addEventListener("change", () => {
    if (stockData.length === 0) return;

    updatePriceChart();
    updateMACD();
});
```

