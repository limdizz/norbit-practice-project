using System;
using System.Collections.Generic;

namespace WebAPI.Models;

public partial class BookingEquipment
{
    public int BookingEquipmentId { get; set; }

    public int BookingId { get; set; }

    public int EquipmentId { get; set; }

    public int? Quantity { get; set; }

    public virtual Booking? Booking { get; set; } = null!;

    public virtual Equipment? Equipment { get; set; } = null!;
}
