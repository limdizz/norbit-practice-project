using System;
using System.Collections.Generic;

namespace WebAPI.Models;

public partial class Booking
{
    public int BookingId { get; set; }

    public int UserId { get; set; }

    public int RoomId { get; set; }

    public int StaffId { get; set; }

    public DateTime? StartTime { get; set; }

    public DateTime? EndTime { get; set; }

    public string? Status { get; set; }

    public DateTime? CreationDate { get; set; }

    public virtual ICollection<Bill> Bills { get; set; } = new List<Bill>();

    public virtual ICollection<BookingEquipment> BookingEquipments { get; set; } = new List<BookingEquipment>();

    public virtual Room? Room { get; set; } = null!;

    public virtual Staff? Staff { get; set; } = null!;

    public virtual User? User { get; set; } = null!;
}
