using System;
using System.Collections.Generic;

namespace WebAPI.Models;

public partial class User
{
    public int UserId { get; set; }

    public string? UserSurname { get; set; }

    public string? UserName { get; set; }

    public string? UserPhone { get; set; }

    public string? UserEmail { get; set; }

    public DateTime? RegistrationDate { get; set; }

    public virtual ICollection<Bill> Bills { get; set; } = new List<Bill>();

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual ICollection<Staff> Staff { get; set; } = new List<Staff>();

    public virtual ICollection<UserSubscription> UserSubscriptions { get; set; } = new List<UserSubscription>();
}
