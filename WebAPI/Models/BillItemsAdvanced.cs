using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAPI.Models;

public partial class BillItemsAdvanced
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int BillItemId { get; set; }

    public Guid? BillUid { get; set; }

    public string? ItemType { get; set; }

    public string? ItemName { get; set; }

    public int? Quantity { get; set; }

    public decimal? UnitPrice { get; set; }

    public decimal? TotalPrice { get; set; }

    public virtual BillsAdvanced? BillU { get; set; }
}
