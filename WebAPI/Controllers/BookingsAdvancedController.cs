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

        private async Task<int> RefreshBookingStatusesByEndTimeAsync()
        {
            // Нормализация статуса по времени окончания:
            // - EndTime < now  => completed
            // - EndTime >= now => in progress
            // cancel/cancelled не трогаем.
            var now = DateTime.Now;

            var bookings = await _context.BookingsAdvanceds
                .Where(b =>
                    b.Status != "cancelled" &&
                    b.EndTime.HasValue)
                .ToListAsync();

            int updatedCount = 0;
            foreach (var booking in bookings)
            {
                var shouldStatus = booking.EndTime!.Value < now ? "completed" : "in progress";
                if (!string.Equals(booking.Status, shouldStatus, StringComparison.Ordinal))
                {
                    booking.Status = shouldStatus;
                    updatedCount++;
                }
            }

            if (updatedCount > 0)
            {
                await _context.SaveChangesAsync();
            }

            return updatedCount;
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
            await RefreshBookingStatusesByEndTimeAsync();
            return await _context.BookingsAdvanceds.ToListAsync();
        }

        // GET: api/BookingsAdvanced/admin?staffUserUid={userUid}
        // Возвращает список бронирований для административной панели
        [HttpGet("admin")]
        public async Task<ActionResult<IEnumerable<object>>> GetBookingsForAdmin([FromQuery] Guid staffUserUid)
        {
            await RefreshBookingStatusesByEndTimeAsync();

            var isStaff = await _context.StaffAdvanceds
                .AnyAsync(s => s.UserUid == staffUserUid);

            if (!isStaff)
            {
                return Forbid();
            }

            var bookings = await _context.BookingsAdvanceds
                .Include(b => b.UserU)
                .Include(b => b.Room)
                .Include(b => b.Instrument)
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
                    b.InstrumentId,
                    instrumentName = b.Instrument != null ? b.Instrument.Name : null,
                    b.StaffUid,
                    staffName = b.StaffU != null ? b.StaffU.StaffPosition : null,
                    b.StartTime,
                    b.EndTime,
                    b.Status
                })
                .ToListAsync();

            return bookings;
        }

        // GET: api/BookingsAdvanced/byRoom/{roomId}
        // Используется фронтендом для отключения занятых временных слотов
        [HttpGet("byRoom/{roomId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetBookingsByRoom([FromRoute] int roomId)
        {
            var bookings = await _context.BookingsAdvanceds
                .Where(b =>
                    b.RoomId == roomId &&
                    b.Status != "cancelled" &&
                    b.StartTime.HasValue &&
                    b.EndTime.HasValue)
                .Select(b => new
                {
                    b.BookingUid,
                    b.StartTime,
                    b.EndTime,
                    b.Status
                })
                .ToListAsync();

            return bookings;
        }

        // GET: api/BookingsAdvanced/byInstrument/{instrumentId}
        // Используется фронтендом для отключения занятых дат
        [HttpGet("byInstrument/{instrumentId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetBookingsByInstrument([FromRoute] int instrumentId)
        {
            var bookings = await _context.BookingsAdvanceds
                .Where(b =>
                    b.InstrumentId == instrumentId &&
                    b.Status != "cancelled" &&
                    b.StartTime.HasValue &&
                    b.EndTime.HasValue)
                .Select(b => new
                {
                    b.BookingUid,
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
            await RefreshBookingStatusesByEndTimeAsync();
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

            // Пересчет статуса: считаем актуальным, пока EndTime не прошел
            if (bookingsAdvanced.EndTime.HasValue && bookingsAdvanced.EndTime.Value >= DateTime.Now)
            {
                bookingsAdvanced.Status = "in progress";
            }
            else if (bookingsAdvanced.EndTime.HasValue)
            {
                bookingsAdvanced.Status = "completed";
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

            if (booking.EndTime.HasValue && booking.EndTime.Value >= DateTime.Now)
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

        public class CreateBookingRequest
        {
            public Guid UserUid { get; set; }
            public int? RoomId { get; set; }
            public int? InstrumentId { get; set; }
            public DateTime StartTime { get; set; }
            public DateTime EndTime { get; set; }
            public List<int> SelectedEquipment { get; set; } = new List<int>();
        }

        // POST: api/BookingsAdvanced
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<object>> PostBookingsAdvanced([FromBody] CreateBookingRequest request)
        {
            // Генерируем новый GUID
            var booking = new BookingsAdvanced
            {
                BookingUid = Guid.NewGuid(),
                UserUid = request.UserUid,
                RoomId = request.RoomId,
                InstrumentId = request.InstrumentId,
                StartTime = request.StartTime.ToLocalTime(),
                EndTime = request.EndTime.ToLocalTime(),
                CreationDate = DateTime.Now
            };

            // Валидация времени
            if (booking.StartTime >= booking.EndTime)
            {
                return BadRequest("Время начала должно быть строго раньше времени окончания.");
            }

            // Проверка на конфликты
            if (booking.StartTime.HasValue && booking.EndTime.HasValue &&
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
                        return Conflict("Помещение уже занято на выбранное время.");
                    return Conflict("Инструмент уже занят на выбранное время.");
                }
            }

            // Статус
            booking.Status = booking.EndTime >= DateTime.Now ? "in progress" : "completed";

            // Назначение случайного сотрудника
            if (booking.StaffUid == null)
            {
                var randomStaff = await _context.StaffAdvanceds
                    .Select(s => new { s.StaffUid })
                    .FirstOrDefaultAsync();

                if (randomStaff != null)
                {
                    booking.StaffUid = randomStaff.StaffUid;
                }
            }

            // === ДОБАВЛЕНИЕ СЧЁТА (BILL) ===
            var bill = new BillsAdvanced
            {
                BillUid = Guid.NewGuid(),
                BookingUid = booking.BookingUid,
                UserUid = booking.UserUid,
                TotalSum = 0,
                PaymentStatus = "not paid",
                CreationDate = DateTime.Now,
                SubscriptionUsed = false,
                SubscriptionUid = null
            };

            // Сохраняем бронь и счёт
            _context.BookingsAdvanceds.Add(booking);
            _context.BillsAdvanceds.Add(bill);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                if (BookingsAdvancedExists(booking.BookingUid))
                {
                    return Conflict();
                }
                throw;
            }

            // === ДОБАВЛЕНИЕ ОБОРУДОВАНИЯ (если есть) ===
            var equipmentLinks = new List<BookingEquipment>();

            if (request.SelectedEquipment != null && request.SelectedEquipment.Any())
            {
                var uniqueIds = request.SelectedEquipment.Distinct().ToList();

                foreach (var equipmentId in uniqueIds)
                {
                    var exists = await _context.Equipment.AnyAsync(e => e.EquipmentId == equipmentId && e.IsRentable == true);
                    if (!exists) continue;

                    equipmentLinks.Add(new BookingEquipment
                    {
                        BookingUid = booking.BookingUid,
                        EquipmentId = equipmentId
                    });
                }

                if (equipmentLinks.Any())
                {
                    _context.BookingEquipments.AddRange(equipmentLinks);
                    await _context.SaveChangesAsync();
                }
            }

            // === ТЕПЕРЬ РАССЧИТЫВАЕМ ПУНКТЫ СЧЁТА (включая оборудование) ===
            var billItems = new List<BillItemsAdvanced>();
            decimal totalSum = 0;

            // 1. Основная позиция: комната или инструмент
            string itemName = null;
            decimal unitPrice = 0;
            int mainQuantity = 1;

            if (booking.RoomId.HasValue)
            {
                // Подтягиваем RoomType, чтобы взять актуальную цену напрямую из БД, а не из словаря
                var room = await _context.Rooms
                    .Include(r => r.RoomType)
                    .FirstOrDefaultAsync(r => r.RoomId == booking.RoomId);

                if (room != null)
                {
                    itemName = $"Аренда помещения: {room.Name}";
                    unitPrice = room.RoomType?.RentalPricePerHour ?? 0m;

                    // Помещения бронируются по часам
                    mainQuantity = (int)Math.Ceiling((booking.EndTime.Value - booking.StartTime.Value).TotalHours);
                    if (mainQuantity < 1) mainQuantity = 1;
                }
            }
            else if (booking.InstrumentId.HasValue)
            {
                var equipment = await _context.Equipment.FindAsync(booking.InstrumentId);
                if (equipment != null)
                {
                    itemName = $"Аренда инструмента: {equipment.Name}";
                    unitPrice = equipment.RentalPrice ?? 0m;

                    // Инструменты бронируются по дням!
                    mainQuantity = (int)Math.Ceiling((booking.EndTime.Value - booking.StartTime.Value).TotalDays);
                    if (mainQuantity < 1) mainQuantity = 1;
                }
            }

            if (!string.IsNullOrEmpty(itemName))
            {
                var itemTotal = unitPrice * mainQuantity;
                var mainItem = new BillItemsAdvanced
                {
                    BillUid = bill.BillUid,
                    ItemType = booking.RoomId.HasValue ? "Room" : "Instrument",
                    ItemName = itemName,
                    Quantity = mainQuantity,
                    UnitPrice = unitPrice,
                    TotalPrice = itemTotal
                };

                billItems.Add(mainItem);
                totalSum += itemTotal;
            }

            // 2. Дополнительное оборудование (уже добавленное в БД)
            var addedEquipment = await _context.BookingEquipments
                .Where(be => be.BookingUid == booking.BookingUid)
                .Include(be => be.Equipment)
                .ToListAsync();

            foreach (var link in addedEquipment)
            {
                var eq = link.Equipment;
                if (eq == null) continue;

                // Согласно логике фронтенда, доп. оборудование оплачивается разово за сессию.
                // Поэтому жестко ставим количество = 1.
                int eqQuantity = 1;
                var itemTotal = (eq.RentalPrice ?? 0m) * eqQuantity;

                var eqItem = new BillItemsAdvanced
                {
                    BillUid = bill.BillUid,
                    ItemType = "Equipment",
                    ItemName = $"Доп. оборудование: {eq.Name}",
                    Quantity = eqQuantity,
                    UnitPrice = eq.RentalPrice ?? 0m,
                    TotalPrice = itemTotal
                };

                billItems.Add(eqItem);
                totalSum += itemTotal;
            }

            // Обновляем сумму счёта и сохраняем пункты
            bill.TotalSum = totalSum;
            _context.BillItemsAdvanceds.AddRange(billItems);
            await _context.SaveChangesAsync();
            // === Формируем ответ ===
            var result = new
            {
                booking.BookingUid,
                booking.UserUid,
                booking.RoomId,
                booking.InstrumentId,
                booking.StaffUid,
                booking.StartTime,
                booking.EndTime,
                booking.Status,
                booking.CreationDate,
                BillUid = bill.BillUid,
                TotalSum = bill.TotalSum
            };

            return CreatedAtAction("GetBookingsAdvanced", new { id = booking.BookingUid }, result);
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

        // POST: api/BookingsAdvanced/admin/refresh-expired-statuses?staffUserUid={userUid}
        // Массовое обновление статусов "in progress" -> "completed", если EndTime уже прошел
        [HttpPost("admin/refresh-expired-statuses")]
        public async Task<ActionResult<object>> RefreshExpiredStatusesForAdmin([FromQuery] Guid staffUserUid)
        {
            var isStaff = await _context.StaffAdvanceds.AnyAsync(s => s.UserUid == staffUserUid);
            if (!isStaff)
            {
                return Forbid();
            }

            var updated = await RefreshBookingStatusesByEndTimeAsync();
            return Ok(new { updated });
        }
    }
}
