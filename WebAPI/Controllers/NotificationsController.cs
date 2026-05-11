using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAPI.Models;

namespace WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly PracticeProjectContext _context;

    public NotificationsController(PracticeProjectContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Получить все уведомления пользователя
    /// </summary>
    [HttpGet("user/{userUid}")]
    public async Task<ActionResult<IEnumerable<NotificationDTO>>> GetUserNotifications(Guid userUid)
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserUid == userUid)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new NotificationDTO
            {
                NotificationId = n.NotificationId,
                UserUid = n.UserUid,
                BookingUid = n.BookingUid,
                NotificationType = n.NotificationType,
                Title = n.Title,
                Message = n.Message,
                CreatedAt = n.CreatedAt,
                IsRead = n.IsRead
            })
            .ToListAsync();

        return Ok(notifications);
    }

    /// <summary>
    /// Получить непрочитанные уведомления пользователя
    /// </summary>
    [HttpGet("user/{userUid}/unread")]
    public async Task<ActionResult<int>> GetUnreadCount(Guid userUid)
    {
        var count = await _context.Notifications
            .Where(n => n.UserUid == userUid && !n.IsRead)
            .CountAsync();

        return Ok(count);
    }

    /// <summary>
    /// Отметить уведомление как прочитанное
    /// </summary>
    [HttpPut("{notificationId}/read")]
    public async Task<ActionResult> MarkAsRead(Guid notificationId)
    {
        var notification = await _context.Notifications.FindAsync(notificationId);
        if (notification == null)
        {
            return NotFound("Уведомление не найдено");
        }

        notification.IsRead = true;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Отметить все уведомления пользователя как прочитанные
    /// </summary>
    [HttpPut("user/{userUid}/mark-all-read")]
    public async Task<ActionResult> MarkAllAsRead(Guid userUid)
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserUid == userUid && !n.IsRead)
            .ToListAsync();

        foreach (var notification in notifications)
        {
            notification.IsRead = true;
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Создать уведомление (для внутренних нужд системы)
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<NotificationDTO>> CreateNotification(CreateNotificationDTO dto)
    {
        var notification = new Notification
        {
            UserUid = dto.UserUid,
            BookingUid = dto.BookingUid,
            NotificationType = dto.NotificationType,
            Title = dto.Title,
            Message = dto.Message,
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetUserNotifications),
            new { userUid = notification.UserUid },
            new NotificationDTO
            {
                NotificationId = notification.NotificationId,
                UserUid = notification.UserUid,
                BookingUid = notification.BookingUid,
                NotificationType = notification.NotificationType,
                Title = notification.Title,
                Message = notification.Message,
                CreatedAt = notification.CreatedAt,
                IsRead = notification.IsRead
            });
    }
}
