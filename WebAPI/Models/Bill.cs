using System;
using System.Collections.Generic;

namespace WebAPI.Models;

public partial class Bill
{
    public int BillId { get; set; }

    public int BookingId { get; set; }

    public int UserId { get; set; }

    public decimal? TotalSum { get; set; }

    public bool? SubscriptionUsed { get; set; }

    public int SubscriptionId { get; set; }

    public string? PaymentStatus { get; set; }

    public DateTime? CreationDate { get; set; }

    public virtual ICollection<BillItem> BillItems { get; set; } = new List<BillItem>();

    public virtual Booking? Booking { get; set; } = null!;

    public virtual UserSubscription? Subscription { get; set; } = null!;

    public virtual User? User { get; set; } = null!;
}
