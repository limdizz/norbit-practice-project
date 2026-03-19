using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAPI;
using WebAPI.Models;

namespace WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BookingsAdvancedController : ControllerBase
    {
        private readonly PracticeProjectContext _context;

        public BookingsAdvancedController(PracticeProjectContext context)
        {
            _context = context;
        }

        private async Task<bool> HasConflictAsync(Guid bookingUidToIgnore, int? roomId, int? instrumentId, DateTime startTime, DateTime endTime)
        {
            // Исключаем отмененные бронирования и бронирование, которое переносим/обновляем
            var baseQuery = _context.BookingsAdvanceds
                .Where(b =>
                    b.BookingUid != bookingUidToIgnore &&
                    b.Status != "cancelled" &&
                    b.StartTime.HasValue &&
                    b.EndTime.HasValue);

            if (roomId.HasValue)
            {
                baseQuery = baseQuery.Where(b => b.RoomId == roomId.Value);
            }

            if (instrumentId.HasValue)
            {
                baseQuery = baseQuery.Where(b => b.InstrumentId == instrumentId.Value);
            }

            // Пересечение интервалов: [startTime, endTime) и [b.StartTime, b.EndTime)
            // => startA < endB && endA > startB
            return await baseQuery.AnyAsync(b =>
                startTime < b.EndTime!.Value &&
                endTime > b.StartTime!.Value);
        }

        // GET: api/BookingsAdvanced
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BookingsAdvanced>>> GetBookingsAdvanceds()
        {
            return await _context.BookingsAdvanceds.ToListAsync();
        }

        // GET: api/BookingsAdvanced/admin?staffUserUid={userUid}
        // Возвращает список бронирований для административной панели
        [HttpGet("admin")]
        public async Task<ActionResult<IEnumerable<object>>> GetBookingsForAdmin([FromQuery] Guid staffUserUid)
        {
            var isStaff = await _context.StaffAdvanceds
                .AnyAsync(s => s.UserUid == staffUserUid);

            if (!isStaff)
            {
                return Forbid();
            }

            var bookings = await _context.BookingsAdvanceds
                .Include(b => b.UserU)
                .Include(b => b.Room)
                .Include(b => b.StaffU)
                .Select(b => new
                {
                    b.BookingUid,
                    b.UserUid,
                    userName = b.UserU != null ? b.UserU.Name : null,
                    userSurname = b.UserU != null ? b.UserU.Surname : null,
                    userEmail = b.UserU != null ? b.UserU.Email : null,
                    b.RoomId,
                    roomName = b.Room != null ? b.Room.Name : null,
                    b.StaffUid,
                    staffName = b.StaffU != null ? b.StaffU.StaffPosition : null,
                    b.StartTime,
                    b.EndTime,
                    b.Status
                })
                .ToListAsync();

            return bookings;
        }

        // GET: api/BookingsAdvanced/5
        [HttpGet("{id}")]
        public async Task<ActionResult<BookingsAdvanced>> GetBookingsAdvanced(Guid id)
        {
            var bookingsAdvanced = await _context.BookingsAdvanceds.FindAsync(id);

            if (bookingsAdvanced == null)
            {
                return NotFound();
            }

            return bookingsAdvanced;
        }

        // PUT: api/BookingsAdvanced/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutBookingsAdvanced(Guid id, BookingsAdvanced bookingsAdvanced)
        {
            if (id != bookingsAdvanced.BookingUid)
            {
                return BadRequest();
            }

            // Валидация: время начала не должно быть позже или равно времени окончания
            if (bookingsAdvanced.StartTime.HasValue &&
                bookingsAdvanced.EndTime.HasValue &&
                bookingsAdvanced.StartTime.Value >= bookingsAdvanced.EndTime.Value)
            {
                return BadRequest("Время начала должно быть строго раньше времени окончания.");
            }

            _context.Entry(bookingsAdvanced).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!BookingsAdvancedExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        public class AdminBookingUpdateRequest
        {
            public Guid StaffUserUid { get; set; }
            public DateTime? StartTime { get; set; }
            public DateTime? EndTime { get; set; }
        }

        // PUT: api/BookingsAdvanced/{id}/cancel
        // Отмена бронирования сотрудником
        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> CancelBooking(Guid id, [FromBody] AdminBookingUpdateRequest request)
        {
            var isStaff = await _context.StaffAdvanceds
                .AnyAsync(s => s.UserUid == request.StaffUserUid);

            if (!isStaff)
            {
                return Forbid();
            }

            var booking = await _context.BookingsAdvanceds.FindAsync(id);
            if (booking == null)
            {
                return NotFound();
            }

            booking.Status = "cancelled";
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // PUT: api/BookingsAdvanced/{id}/reschedule
        // Перенос бронирования сотрудником
        [HttpPut("{id}/reschedule")]
        public async Task<IActionResult> RescheduleBooking(Guid id, [FromBody] AdminBookingUpdateRequest request)
        {
            var isStaff = await _context.StaffAdvanceds
                .AnyAsync(s => s.UserUid == request.StaffUserUid);

            if (!isStaff)
            {
                return Forbid();
            }

            var booking = await _context.BookingsAdvanceds.FindAsync(id);
            if (booking == null)
            {
                return NotFound();
            }

            if (request.StartTime.HasValue)
            {
                booking.StartTime = request.StartTime.Value.ToLocalTime();
            }

            if (request.EndTime.HasValue)
            {
                booking.EndTime = request.EndTime.Value.ToLocalTime();
            }

            // Валидация после обновления временных полей
            if (booking.StartTime.HasValue &&
                booking.EndTime.HasValue &&
                booking.StartTime.Value >= booking.EndTime.Value)
            {
                return BadRequest("Время начала должно быть строго раньше времени окончания.");
            }

            // Проверка пересечения: нельзя переносить в занятое время
            if (booking.StartTime.HasValue &&
                booking.EndTime.HasValue &&
                (booking.RoomId.HasValue || booking.InstrumentId.HasValue))
            {
                var conflicts = await HasConflictAsync(
                    bookingUidToIgnore: booking.BookingUid,
                    roomId: booking.RoomId,
                    instrumentId: booking.InstrumentId,
                    startTime: booking.StartTime.Value,
                    endTime: booking.EndTime.Value);

                if (conflicts)
                {
                    if (booking.RoomId.HasValue)
                    {
                        return Conflict("Помещение уже занято на выбранное время.");
                    }

                    return Conflict("Инструмент уже занят на выбранное время.");
                }
            }

            if (booking.StartTime.HasValue && booking.StartTime.Value > DateTime.Now)
            {
                booking.Status = "in progress";
            }
            else
            {
                booking.Status = "completed";
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/BookingsAdvanced
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<object>> PostBookingsAdvanced(BookingsAdvanced bookingsAdvanced)
        {
            // Генерируем новый GUID
            bookingsAdvanced.BookingUid = Guid.NewGuid();
            bookingsAdvanced.CreationDate = DateTime.Now;

            // Конвертируем UTC время в локальное для PostgreSQL
            if (bookingsAdvanced.StartTime.HasValue)
            {
                bookingsAdvanced.StartTime = bookingsAdvanced.StartTime.Value.ToLocalTime();
            }

            if (bookingsAdvanced.EndTime.HasValue)
            {
                bookingsAdvanced.EndTime = bookingsAdvanced.EndTime.Value.ToLocalTime();
            }

            // Валидация после конвертации во внутренний формат (локальное время)
            if (bookingsAdvanced.StartTime.HasValue &&
                bookingsAdvanced.EndTime.HasValue &&
                bookingsAdvanced.StartTime.Value >= bookingsAdvanced.EndTime.Value)
            {
                return BadRequest("Время начала должно быть строго раньше времени окончания.");
            }

            // Проверка пересечения: нельзя бронировать уже занятое помещение/инструмент
            if (bookingsAdvanced.StartTime.HasValue &&
                bookingsAdvanced.EndTime.HasValue &&
                (bookingsAdvanced.RoomId.HasValue || bookingsAdvanced.InstrumentId.HasValue))
            {
                var conflicts = await HasConflictAsync(
                    bookingUidToIgnore: bookingsAdvanced.BookingUid,
                    roomId: bookingsAdvanced.RoomId,
                    instrumentId: bookingsAdvanced.InstrumentId,
                    startTime: bookingsAdvanced.StartTime.Value,
                    endTime: bookingsAdvanced.EndTime.Value);

                if (conflicts)
                {
                    if (bookingsAdvanced.RoomId.HasValue)
                    {
                        return Conflict("Помещение уже занято на выбранное время.");
                    }

                    return Conflict("Инструмент уже занят на выбранное время.");
                }
            }

            // Логика статуса
            if (bookingsAdvanced.StartTime.HasValue && bookingsAdvanced.StartTime.Value > DateTime.Now)
            {
                bookingsAdvanced.Status = "in progress";
            }
            else
            {
                bookingsAdvanced.Status = "completed";
            }

            // Назначение случайного сотрудника
            if (bookingsAdvanced.StaffUid == null)
            {
                var randomStaff = await _context.StaffAdvanceds
                    .Select(s => new { s.StaffUid })
                    .FirstOrDefaultAsync();

                if (randomStaff != null)
                {
                    bookingsAdvanced.StaffUid = randomStaff.StaffUid;
                }
            }

            _context.BookingsAdvanceds.Add(bookingsAdvanced);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                if (BookingsAdvancedExists(bookingsAdvanced.BookingUid))
                {
                    return Conflict();
                }
                else
                {
                    throw;
                }
            }

            // Возвращаем только необходимые поля, избегая циклических ссылок
            var result = new
            {
                bookingsAdvanced.BookingUid,
                bookingsAdvanced.UserUid,
                bookingsAdvanced.RoomId,
                bookingsAdvanced.StaffUid,
                bookingsAdvanced.StartTime,
                bookingsAdvanced.EndTime,
                bookingsAdvanced.Status,
                bookingsAdvanced.CreationDate
            };

            return CreatedAtAction("GetBookingsAdvanced", new { id = bookingsAdvanced.BookingUid }, result);
        }

        // DELETE: api/BookingsAdvanced/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBookingsAdvanced(Guid id)
        {
            var bookingsAdvanced = await _context.BookingsAdvanceds.FindAsync(id);
            if (bookingsAdvanced == null)
            {
                return NotFound();
            }

            _context.BookingsAdvanceds.Remove(bookingsAdvanced);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/BookingsAdvanced/byUser/5
        [HttpDelete("byUser/{userUid}")]
        public async Task<IActionResult> DeleteBookingsByUser(Guid userUid)
        {
            // Находим все бронирования этого пользователя
            var userBookings = await _context.BookingsAdvanceds
                .Where(b => b.UserUid == userUid)
                .ToListAsync();

            if (userBookings == null || !userBookings.Any())
            {
                return NotFound("Бронирования для этого пользователя не найдены.");
            }

            _context.BookingsAdvanceds.RemoveRange(userBookings);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool BookingsAdvancedExists(Guid id)
        {
            return _context.BookingsAdvanceds.Any(e => e.BookingUid == id);
        }
    }
}
