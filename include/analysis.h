#ifndef ANALYSIS_H
#define ANALYSIS_H

#include <vector>
#include <string>

std::vector<double> calculateSMA(const std::vector<double>& prices, int period);

std::vector<double> calculateEMA(const std::vector<double>& prices, int period);

std::vector<double> calculateMACD(const std::vector<double>& prices);

std::vector<std::string> detectBreakouts(
    const std::vector<double>& prices,
    int period
);

#endif
