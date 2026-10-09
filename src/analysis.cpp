#include "../include/analysis.h"

std::vector<double> calculateSMA(
    const std::vector<double>& prices,
    int period)
{
    std::vector<double> sma;

    if (period <= 0 || prices.size() < period)
    {
        return sma;
    }

    for (int i = 0; i <= prices.size() - period; i++)
    {
        double sum = 0.0;

        for (int j = i; j < i + period; j++)
        {
            sum += prices[j];
        }

        sma.push_back(sum / period);
    }

    return sma;
}


std::vector<double> calculateEMA(
    const std::vector<double>& prices,
    int period)
{
    std::vector<double> ema;

    if (period <= 0 || prices.size() < period)
    {
        return ema;
    }

    // First EMA value = SMA of first period
    double sum = 0.0;

    for (int i = 0; i < period; i++)
    {
        sum += prices[i];
    }

    double previousEMA = sum / period;

    ema.push_back(previousEMA);

    // EMA multiplier
    double multiplier = 2.0 / (period + 1);

    for (int i = period; i < prices.size(); i++)
    {
        double currentEMA =
            (prices[i] - previousEMA) * multiplier
            + previousEMA;

        ema.push_back(currentEMA);

        previousEMA = currentEMA;
    }

    return ema;
}
