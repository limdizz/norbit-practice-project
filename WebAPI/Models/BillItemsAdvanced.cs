using System;
using System.Collections.Generic;

namespace WebAPI.Models;

public partial class BillItemsAdvanced
{
    public int BillItemId { get; set; }

    public Guid? BillUid { get; set; }

    public string? ItemType { get; set; }

    public string? ItemName { get; set; }

    public int? Quantity { get; set; }

    public decimal? UnitPrice { get; set; }

    public decimal? TotalPrice { get; set; }

    public virtual BillsAdvanced? BillU { get; set; }
}
