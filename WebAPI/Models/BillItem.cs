using System;
using System.Collections.Generic;

namespace WebAPI.Models;

public partial class BillItem
{
    public int BillItemId { get; set; }

    public int BillId { get; set; }

    public string? ItemType { get; set; }

    public string? ItemName { get; set; }

    public int? Quantity { get; set; }

    public decimal? UnitPrice { get; set; }

    public decimal? TotalPrice { get; set; }

    public virtual Bill? Bill { get; set; } = null!;
}
