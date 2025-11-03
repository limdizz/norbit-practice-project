using System;
using System.Collections.Generic;

namespace WebAPI.Models;

public partial class StaffAdvanced
{
    public Guid StaffUid { get; set; }

    public Guid? UserUid { get; set; }

    public string? StaffPosition { get; set; }

    public DateOnly? HireDate { get; set; }

    public DateOnly? FireDate { get; set; }

    public virtual ICollection<BookingsAdvanced> BookingsAdvanceds { get; set; } = new List<BookingsAdvanced>();

    public virtual UsersAdvanced? UserU { get; set; }
}
