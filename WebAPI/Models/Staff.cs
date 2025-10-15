using System;
using System.Collections.Generic;

namespace WebAPI.Models;

public partial class Staff
{
    public int StaffId { get; set; }

    public int UserId { get; set; }

    public string? StaffPosition { get; set; }

    public DateOnly? HireDate { get; set; }

    public DateOnly? FireDate { get; set; }

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual User? User { get; set; } = null!;
}
