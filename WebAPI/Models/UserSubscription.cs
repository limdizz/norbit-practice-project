using System;
using System.Collections.Generic;

namespace WebAPI.Models;

public partial class UserSubscription
{
    public int SubscriptionId { get; set; }

    public int UserId { get; set; }

    public int PlanId { get; set; }

    public DateTime? PurchaseDate { get; set; }

    public int? SessionsRemaining { get; set; }

    public DateTime? ValidUntil { get; set; }

    public bool? IsActive { get; set; }

    public virtual ICollection<Bill> Bills { get; set; } = new List<Bill>();

    public virtual SubscriptionPlan? Plan { get; set; } = null!;

    public virtual User? User { get; set; } = null!;
}
