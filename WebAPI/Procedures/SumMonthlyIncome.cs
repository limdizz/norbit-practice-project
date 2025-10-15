using System;
using System.Collections.Generic;

namespace WebAPI.Procedures;

public partial class SumMonthlyIncome
{
    public decimal? Month { get; set; }

    public decimal? TotalIncome { get; set; }
}
