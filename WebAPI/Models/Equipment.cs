using System;
using System.Collections.Generic;

namespace WebAPI.Models;

public partial class Equipment
{
    public int EquipmentId { get; set; }

    public string? Name { get; set; }

    public string? Category { get; set; }

    public decimal? RentalPrice { get; set; }

    public bool? IsRentable { get; set; }

    public string? CurrentCondition { get; set; }

    public virtual ICollection<BookingEquipment> BookingEquipments { get; set; } = new List<BookingEquipment>();

    public virtual ICollection<RoomEquipment> RoomEquipments { get; set; } = new List<RoomEquipment>();
}
