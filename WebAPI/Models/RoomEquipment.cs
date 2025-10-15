using System;
using System.Collections.Generic;

namespace WebAPI.Models;

public partial class RoomEquipment
{
    public int RoomId { get; set; }

    public int EquipmentId { get; set; }

    public int? Quantity { get; set; }

    public virtual Equipment? Equipment { get; set; } = null!;

    public virtual Room? Room { get; set; } = null!;
}
