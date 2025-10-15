using System;
using System.Collections.Generic;

namespace WebAPI.Procedures;

public partial class SelectOnlyStaffUserInfo
{
    public int? UserId { get; set; }

    public string? UserSurname { get; set; }

    public string? UserName { get; set; }

    public string? UserPhone { get; set; }

    public string? UserEmail { get; set; }

    public DateTime? RegistrationDate { get; set; }

    public int? StaffId { get; set; }

    public string? StaffPosition { get; set; }

    public DateOnly? HireDate { get; set; }

    public DateOnly? FireDate { get; set; }
}
