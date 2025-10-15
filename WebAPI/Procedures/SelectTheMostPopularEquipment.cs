using System;
using System.Collections.Generic;

namespace WebAPI.Procedures;

public partial class SelectTheMostPopularEquipment
{
    public string? Name { get; set; }

    public string? Category { get; set; }

    public long? TotalRentals { get; set; }
}
