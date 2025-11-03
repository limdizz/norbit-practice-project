using System;
using System.Collections.Generic;

namespace WebAPI.Models;

public partial class UserSubscriptionsAdvanced
{
    public Guid SubscriptionUid { get; set; }

    public Guid? UserUid { get; set; }

    public int? PlanId { get; set; }

    public DateTime? PurchaseDate { get; set; }

    public int? SessionsRemaining { get; set; }

    public DateTime? ValidUntil { get; set; }

    public bool? IsActive { get; set; }

    public virtual ICollection<BillsAdvanced> BillsAdvanceds { get; set; } = new List<BillsAdvanced>();

    public virtual SubscriptionPlan? Plan { get; set; }

    public virtual UsersAdvanced? UserU { get; set; }
}
