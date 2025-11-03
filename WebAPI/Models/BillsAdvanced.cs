using System;
using System.Collections.Generic;
using WebAPI.Models;

namespace WebAPI;

public partial class BillsAdvanced
{
    public Guid BillUid { get; set; }

    public Guid? BookingUid { get; set; }

    public Guid? UserUid { get; set; }

    public decimal? TotalSum { get; set; }

    public bool? SubscriptionUsed { get; set; }

    public Guid? SubscriptionUid { get; set; }

    public string? PaymentStatus { get; set; }

    public DateTime? CreationDate { get; set; }

    public virtual ICollection<BillItemsAdvanced> BillItemsAdvanceds { get; set; } = new List<BillItemsAdvanced>();

    public virtual BookingsAdvanced? Bookin { get; set; }

    public virtual UserSubscriptionsAdvanced? SubscriptionU { get; set; }

    public virtual UsersAdvanced? UserU { get; set; }
}
