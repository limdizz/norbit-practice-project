using System;
using System.Collections.Generic;

namespace WebAPI.Models;

public partial class Room
{
    public int RoomId { get; set; }

    public int RoomTypeId { get; set; }

    public string? Name { get; set; }

    public bool? IsFree { get; set; }

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual ICollection<RoomEquipment> RoomEquipments { get; set; } = new List<RoomEquipment>();

    public virtual RoomType? RoomType { get; set; } = null!;
}
