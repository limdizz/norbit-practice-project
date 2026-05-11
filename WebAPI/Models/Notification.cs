namespace WebAPI.Models;

public class Notification
{
    public Guid NotificationId { get; set; } = Guid.NewGuid();
    public Guid UserUid { get; set; }
    public Guid? BookingUid { get; set; }
    public string NotificationType { get; set; } = string.Empty; // "new_booking", "booking_rescheduled", "booking_cancelled"
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsRead { get; set; } = false;

    // Навигационные свойства
    public virtual UsersAdvanced? User { get; set; }
    public virtual BookingsAdvanced? BookingU { get; set; }
}
