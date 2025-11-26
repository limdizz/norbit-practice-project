using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAPI.Models;

public partial class Equipment
{
    public int EquipmentId { get; set; }

    public string? Name { get; set; }

    public string? Category { get; set; }

    public decimal? RentalPrice { get; set; }

    public bool? IsRentable { get; set; }

    public string? CurrentCondition { get; set; }

    [Column("image_url")] 
    public string? ImageUrl { get; set; }

    [Column("color")]
    public string? Color { get; set; }

    [Column("handedness")]
    public string? Handedness { get; set; }

    public virtual ICollection<BookingEquipment> BookingEquipments { get; set; } = new List<BookingEquipment>();

    public virtual ICollection<RoomEquipment> RoomEquipments { get; set; } = new List<RoomEquipment>();
}
