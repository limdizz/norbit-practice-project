using System;
using System.Collections.Generic;

namespace WebAPI.Models;

public partial class UsersAdvanced
{
    public Guid UserUid { get; set; }

    public string? Surname { get; set; }

    public string? Name { get; set; }

    public string? Phone { get; set; }

    public string? Email { get; set; }

    public string? PasswordHash { get; set; }

    public DateTime? RegistrationDate { get; set; }

    public string? PasswordSalt { get; set; }

    public string? PasswordOrigin { get; set; }

    public virtual ICollection<BillsAdvanced> BillsAdvanceds { get; set; } = new List<BillsAdvanced>();

    public virtual ICollection<BookingsAdvanced> BookingsAdvanceds { get; set; } = new List<BookingsAdvanced>();

    public virtual ICollection<StaffAdvanced> StaffAdvanceds { get; set; } = new List<StaffAdvanced>();

    public virtual ICollection<UserSubscriptionsAdvanced> UserSubscriptionsAdvanceds { get; set; } = new List<UserSubscriptionsAdvanced>();
}
