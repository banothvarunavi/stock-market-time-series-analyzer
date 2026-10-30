#include "analysis.h"
#include <vector>

// Simple Moving Average
std::vector<double> calculateSMA(const std::vector<double>& prices, int period)
{
    std::vector<double> sma;

    if (prices.size() < period)
        return sma;

    for (size_t i = 0; i <= prices.size() - period; i++)
    {
        double sum = 0.0;

        for (int j = 0; j < period; j++)
        {
            sum += prices[i + j];
        }

        sma.push_back(sum / period);
    }

    return sma;
}

// Exponential Moving Average
std::vector<double> calculateEMA(const std::vector<double>& prices, int period)
{
    std::vector<double> ema;

    if (prices.size() < period)
        return ema;

    double sum = 0.0;

    for (int i = 0; i < period; i++)
    {
        sum += prices[i];
    }

    double previousEMA = sum / period;
    ema.push_back(previousEMA);

    double multiplier = 2.0 / (period + 1);

    for (size_t i = period; i < prices.size(); i++)
    {
        double currentEMA =
            ((prices[i] - previousEMA) * multiplier) + previousEMA;

        ema.push_back(currentEMA);
        previousEMA = currentEMA;
    }

    return ema;
}

// MACD
std::vector<double> calculateMACD(const std::vector<double>& prices)
{
    std::vector<double> ema12 = calculateEMA(prices, 12);
    std::vector<double> ema26 = calculateEMA(prices, 26);

    std::vector<double> macd;

    if (ema26.empty())
        return macd;

    int start = 26 - 12;

    for (int i = start; i < static_cast<int>(ema12.size()); i++)
    {
        int ema26Index = i - start;

        if (ema26Index < static_cast<int>(ema26.size()))
        {
            macd.push_back(ema12[i] - ema26[ema26Index]);
        }
    }

    return macd;
}
