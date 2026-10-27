#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <algorithm>

#include "../include/stock_record.h"

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

std::string removeCommas(std::string value)
{
    value.erase(
        std::remove(value.begin(), value.end(), ','),
        value.end()
    );

    return value;
}

int main()
{
    std::ifstream file("data/stock_data.csv");

    if (!file)
    {
        std::cout << "Unable to open stock data file.\n";
        return 1;
    }

    std::vector<StockRecord> stocks;

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

    std::cout << "Records loaded: "
              << stocks.size() << "\n";

    for (const StockRecord& stock : stocks)
    {
        std::cout << stock.date
                  << " | Close: "
                  << stock.close
                  << " | Volume: "
                  << stock.volume
                  << "\n";
    }

    return 0;
}
