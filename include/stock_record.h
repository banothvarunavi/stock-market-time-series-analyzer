#ifndef STOCK_RECORD_H
#define STOCK_RECORD_H

#include <string>

struct StockRecord
{
    std::string date;

    double open;
    double high;
    double low;
    double close;

    long long volume;
};

#endif
