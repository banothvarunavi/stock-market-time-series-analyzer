#ifndef ANALYSIS_H
#define ANALYSIS_H

#include <vector>

std::vector<double> calculateSMA(
    const std::vector<double>& prices,
    int period
);

std::vector<double> calculateEMA(
    const std::vector<double>& prices,
    int period
);

#endif
