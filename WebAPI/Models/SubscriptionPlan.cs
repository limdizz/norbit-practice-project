using System;
using System.Collections.Generic;
using WebAPI.Models;

namespace WebAPI;

public partial class SubscriptionPlan
{
    public int PlanId { get; set; }

    public string? PlanName { get; set; }

    public int? SessionsCount { get; set; }

    public decimal? TotalPrice { get; set; }

    public int? ValidityDays { get; set; }

    public virtual ICollection<UserSubscription> UserSubscriptions { get; set; } = new List<UserSubscription>();

    public virtual ICollection<UserSubscriptionsAdvanced> UserSubscriptionsAdvanceds { get; set; } = new List<UserSubscriptionsAdvanced>();
}
