using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAPI.Models;

public partial class BookingsAdvanced
{
    public Guid BookingUid { get; set; }

    public Guid? UserUid { get; set; }

    public int? RoomId { get; set; }

    public Guid? StaffUid { get; set; }

    public DateTime? StartTime { get; set; }

    public DateTime? EndTime { get; set; }

    public string? Status { get; set; }

    public DateTime? CreationDate { get; set; }

    [Column("instrument_id")]
    public int? InstrumentId { get; set; }

    public virtual ICollection<BillsAdvanced> BillsAdvanceds { get; set; } = new List<BillsAdvanced>();

    public virtual Room? Room { get; set; }

    public virtual StaffAdvanced? StaffU { get; set; }

    public virtual UsersAdvanced? UserU { get; set; }
}
