namespace WebAPI.Models;

public class NotificationDTO
{
    public Guid NotificationId { get; set; }
    public Guid UserUid { get; set; }
    public Guid? BookingUid { get; set; }
    public string NotificationType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsRead { get; set; }
}

public class CreateNotificationDTO
{
    public Guid UserUid { get; set; }
    public Guid? BookingUid { get; set; }
    public string NotificationType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
