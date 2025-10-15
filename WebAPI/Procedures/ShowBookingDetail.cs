using System;
using System.Collections.Generic;

namespace WebAPI.Procedures;

public partial class ShowBookingDetail
{
    public string? ItemType { get; set; }

    public string? ItemName { get; set; }

    public int? Quantity { get; set; }

    public decimal? UnitPrice { get; set; }

    public decimal? TotalPrice { get; set; }
}
