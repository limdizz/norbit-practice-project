using System;
using System.Collections.Generic;
using WebAPI.Models;

namespace WebAPI;

public partial class Room
{
    public int RoomId { get; set; }

    public int RoomTypeId { get; set; }

    public string? Name { get; set; }

    public bool? IsFree { get; set; }

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual ICollection<BookingsAdvanced> BookingsAdvanceds { get; set; } = new List<BookingsAdvanced>();

    public virtual ICollection<RoomEquipment> RoomEquipments { get; set; } = new List<RoomEquipment>();

    public virtual RoomType RoomType { get; set; } = null!;
}
