#include "../include/analysis.h"
#include <algorithm>

using namespace std;

// Simple Moving Average
vector<double> calculateSMA(const vector<double>& prices, int period)
{
    vector<double> result;

    if (period <= 0 || prices.size() < period)
        return result;

    for (size_t i = period - 1; i < prices.size(); i++)
    {
        double sum = 0;

        for (int j = 0; j < period; j++)
        {
            sum += prices[i - j];
        }

        result.push_back(sum / period);
    }

    return result;
}

// Exponential Moving Average
vector<double> calculateEMA(const vector<double>& prices, int period)
{
    vector<double> result;

    if (period <= 0 || prices.size() < period)
        return result;

    double multiplier = 2.0 / (period + 1);
    double ema = prices[0];

    result.push_back(ema);

    for (size_t i = 1; i < prices.size(); i++)
    {
        ema = (prices[i] - ema) * multiplier + ema;
        result.push_back(ema);
    }

    return result;
}

// Moving Average Convergence Divergence
vector<double> calculateMACD(const vector<double>& prices)
{
    vector<double> result;

    if (prices.size() < 26)
        return result;

    vector<double> ema12 = calculateEMA(prices, 12);
    vector<double> ema26 = calculateEMA(prices, 26);

    for (size_t i = 25; i < prices.size(); i++)
    {
        result.push_back(ema12[i] - ema26[i]);
    }

    return result;
}

// Breakout Detection
vector<string> detectBreakouts(const vector<double>& prices, int period)
{
    vector<string> result;

    if (period <= 0)
        return result;

    for (size_t i = 0; i < prices.size(); i++)
    {
        if (i < static_cast<size_t>(period))
        {
            result.push_back("Insufficient Data");
            continue;
        }

        double highest = prices[i - period];
        double lowest = prices[i - period];

        for (size_t j = i - period; j < i; j++)
        {
            highest = max(highest, prices[j]);
            lowest = min(lowest, prices[j]);
        }

        if (prices[i] > highest)
            result.push_back("Bullish Breakout");
        else if (prices[i] < lowest)
            result.push_back("Bearish Breakout");
        else
            result.push_back("No Breakout");
    }

    return result;
}
