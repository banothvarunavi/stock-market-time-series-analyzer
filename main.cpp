#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <iomanip>

#include "include/stock_record.h"
#include "include/analysis.h"

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
