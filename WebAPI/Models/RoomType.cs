using System;
using System.Collections.Generic;

namespace WebAPI.Models;

public partial class RoomType
{
    public int RoomTypeId { get; set; }

    public string? Name { get; set; }

    public string? Description { get; set; }

    public decimal? RentalPricePerHour { get; set; }

    public virtual ICollection<Room> Rooms { get; set; } = new List<Room>();
}
