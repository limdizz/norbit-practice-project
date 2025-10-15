using System;
using System.Collections.Generic;

namespace WebAPI.Procedures;

public partial class FindRoomAndEquipment
{
    public int? EquipmentId { get; set; }

    public string? Name { get; set; }

    public string? Category { get; set; }

    public decimal? RentalPrice { get; set; }

    public bool? IsRentable { get; set; }

    public string? CurrentCondition { get; set; }

    public int? RoomId { get; set; }

    public int? Quantity { get; set; }
}
