#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <iomanip>
#include <string>
#include <algorithm>

#include "include/stock_record.h"
#include "include/analysis.h"

std::string removeCommas(std::string value)
{
    value.erase(
        std::remove(value.begin(), value.end(), ','),
        value.end()
    );

    return value;
}

std::vector<std::string> parseCSVLine(const std::string& line)
{
    std::vector<std::string> fields;
    std::string field;
    bool inQuotes = false;

    for (char ch : line)
    {
        if (ch == '"')
        {
            inQuotes = !inQuotes;
        }
        else if (ch == ',' && !inQuotes)
        {
            fields.push_back(field);
            field.clear();
        }
        else
        {
            field += ch;
        }
    }

    fields.push_back(field);

    return fields;
}

std::vector<StockRecord> loadStockData()
{
    std::vector<StockRecord> stocks;

    std::ifstream file("data/stock_data.csv");

    if (!file)
    {
        std::cout << "Unable to open stock data file.\n";
        return stocks;
    }

    std::string line;

    // Skip CSV header
    std::getline(file, line);

    while (std::getline(file, line))
    {
        if (line.empty())
            continue;

        std::vector<std::string> fields = parseCSVLine(line);

        if (fields.size() < 6)
            continue;

        try
        {
            StockRecord stock;

            stock.date = fields[0];

            stock.open =
                std::stod(removeCommas(fields[1]));

            stock.high =
                std::stod(removeCommas(fields[2]));

            stock.low =
                std::stod(removeCommas(fields[3]));

            stock.close =
                std::stod(removeCommas(fields[4]));

            stock.volume =
                std::stoll(removeCommas(fields[5]));

            stocks.push_back(stock);
        }
        catch (...)
        {
            continue;
        }
    }

    return stocks;
}

int main()
{
    std::vector<StockRecord> stocks = loadStockData();

    if (stocks.empty())
    {
        return 1;
    }

    std::vector<double> closingPrices;

    for (const StockRecord& stock : stocks)
    {
        closingPrices.push_back(stock.close);
    }

    int period = 3;

    std::vector<double> sma =
        calculateSMA(closingPrices, period);

    std::vector<double> ema =
        calculateEMA(closingPrices, period);

    std::cout << "Records loaded: "
              << stocks.size() << "\n\n";

    std::cout << "3-Day SMA\n";
    std::cout << "---------\n";

    for (double value : sma)
    {
        std::cout << std::fixed
                  << std::setprecision(2)
                  << value << "\n";
    }

    std::cout << "\n3-Day EMA\n";
    std::cout << "---------\n";

    for (double value : ema)
    {
        std::cout << std::fixed
                  << std::setprecision(2)
                  << value << "\n";
    }

    return 0;
}
