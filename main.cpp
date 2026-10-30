#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>

#include "include/stock_record.h"
#include "include/analysis.h"

using namespace std;

// Remove commas from numbers
string removeCommas(string value)
{
    string result;

    for (char c : value)
    {
        if (c != ',')
        {
            result += c;
        }
    }

    return result;
}

// Load stock data from CSV file
vector<StockRecord> loadStockData()
{
    vector<StockRecord> records;

    ifstream file("data/stock_data.csv");

    if (!file.is_open())
    {
        cout << "Error: Could not open stock_data.csv" << endl;
        return records;
    }

    string line;

    getline(file, line);

    while (getline(file, line))
    {
        vector<string> fields;
        string field;
        bool insideQuotes = false;

        for (char c : line)
        {
            if (c == '"')
            {
                insideQuotes = !insideQuotes;
            }
            else if (c == ',' && !insideQuotes)
            {
                fields.push_back(field);
                field.clear();
            }
            else
            {
                field += c;
            }
        }

        fields.push_back(field);

        if (fields.size() < 6)
            continue;

        try
        {
            StockRecord record;

            record.date = fields[0];
            record.open = stod(removeCommas(fields[1]));
            record.high = stod(removeCommas(fields[2]));
            record.low = stod(removeCommas(fields[3]));
            record.close = stod(removeCommas(fields[4]));
            record.volume = stoll(removeCommas(fields[5]));

            records.push_back(record);
        }
        catch (...)
        {
            continue;
        }
    }

    file.close();

    return records;
}

int main()
{
    vector<StockRecord> records = loadStockData();

    cout << "Records loaded: " << records.size() << endl;

    vector<double> closingPrices;

    for (const auto& record : records)
    {
        closingPrices.push_back(record.close);
    }

    // 3-Day SMA
    vector<double> sma = calculateSMA(closingPrices, 3);

    cout << "\n3-Day SMA" << endl;
    cout << "---------" << endl;

    for (double value : sma)
    {
        cout << value << endl;
    }

    // 3-Day EMA
    vector<double> ema = calculateEMA(closingPrices, 3);

    cout << "\n3-Day EMA" << endl;
    cout << "---------" << endl;

    for (double value : ema)
    {
        cout << value << endl;
    }

    // MACD
    vector<double> macd = calculateMACD(closingPrices);

    cout << "\nMACD (12,26)" << endl;
    cout << "------------" << endl;

    for (double value : macd)
    {
        cout << value << endl;
    }

    // 20-Day Breakout Detection
    vector<string> breakouts = detectBreakouts(closingPrices, 20);

    cout << "\n20-Day Breakout Detection" << endl;
    cout << "-------------------------" << endl;

    for (size_t i = 0; i < breakouts.size(); i++)
    {
        cout << records[i].date << " : " << breakouts[i] << endl;
    }

    return 0;
}
