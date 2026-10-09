#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>

#include "../include/stock_record.h"

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
        std::stringstream ss(line);

        StockRecord stock;

        std::string openPrice;
        std::string highPrice;
        std::string lowPrice;
        std::string closePrice;
        std::string volume;

        std::getline(ss, stock.date, ',');
        std::getline(ss, openPrice, ',');
        std::getline(ss, highPrice, ',');
        std::getline(ss, lowPrice, ',');
        std::getline(ss, closePrice, ',');
        std::getline(ss, volume, ',');

        stock.open = std::stod(openPrice);
        stock.high = std::stod(highPrice);
        stock.low = std::stod(lowPrice);
        stock.close = std::stod(closePrice);
        stock.volume = std::stoll(volume);

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
