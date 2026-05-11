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

        // GET: api/BookingsAdvanced/available-ids?date=2024-01-15&type=instrument
        [HttpGet("available-ids")]
        public async Task<ActionResult<object>> GetAvailableItemIds(
            [FromQuery] DateTime date,
            [FromQuery] string type)
        {
            var startOfDay = date.Date;
            var endOfDay = date.Date.AddDays(1);

            if (type == "instrument")
            {
                // Все арендуемые инструменты
                var allInstruments = await _context.Equipment
                    .Where(e => e.IsRentable == true)
                    .Select(e => e.EquipmentId)
                    .ToListAsync();

                // Занятые инструменты на выбранную дату
                var busyInstrumentIds = await _context.BookingsAdvanceds
                    .Where(b => b.InstrumentId.HasValue &&
                                b.Status != "cancelled" &&
                                b.StartTime < endOfDay &&
                                b.EndTime > startOfDay)
                    .Select(b => b.InstrumentId.Value)
                    .Distinct()
                    .ToListAsync();

                var availableIds = allInstruments.Except(busyInstrumentIds).ToList();

                return Ok(new { date, type, availableIds });
            }
            else if (type == "room")
            {
                var allRooms = await _context.Rooms
                    .Select(r => r.RoomId)
                    .ToListAsync();

                var busyRoomIds = await _context.BookingsAdvanceds
                    .Where(b => b.RoomId.HasValue &&
                                b.Status != "cancelled" &&
                                b.StartTime < endOfDay &&
                                b.EndTime > startOfDay)
                    .Select(b => b.RoomId.Value)
                    .Distinct()
                    .ToListAsync();

                var availableIds = allRooms.Except(busyRoomIds).ToList();

                return Ok(new { date, type, availableIds });
            }

            return BadRequest("Type must be 'instrument' or 'room'");
        }

        // GET: api/BookingsAdvanced/available-room-slots?date=2024-04-28&startTime=10:00&endTime=12:00
        [HttpGet("available-room-slots")]
        public async Task<ActionResult<object>> GetAvailableRoomSlots(
            [FromQuery] DateTime date,
            [FromQuery] string startTime,
            [FromQuery] string endTime)
        {
            var startOfDay = date.Date;
            var endOfDay = date.Date.AddDays(1);
            
            // Парсим время
            var startSlot = TimeSpan.Parse(startTime);
            var endSlot = TimeSpan.Parse(endTime);
            
            var requestedStart = startOfDay + startSlot;
            var requestedEnd = startOfDay + endSlot;
            
            // Все помещения
            var allRooms = await _context.Rooms
                .Select(r => new { r.RoomId, r.Name, r.RoomTypeId })
                .ToListAsync();
            
            // Занятые помещения на выбранный временной слот
            var busyRoomIds = await _context.BookingsAdvanceds
                .Where(b => b.RoomId.HasValue &&
                            b.Status != "cancelled" &&
                            b.StartTime < requestedEnd &&
                            b.EndTime > requestedStart)
                .Select(b => b.RoomId.Value)
                .Distinct()
                .ToListAsync();
            
            var availableRooms = allRooms
                .Where(r => !busyRoomIds.Contains(r.RoomId))
                .Select(r => new { r.RoomId, r.Name, r.RoomTypeId })
                .ToList();
            
            return Ok(new 
            { 
                date, 
                startTime, 
                endTime, 
                availableRoomIds = availableRooms.Select(r => r.RoomId).ToList(),
                availableRooms 
            });
        }

        // GET: api/BookingsAdvanced/userHistory/{userUid}
        [HttpGet("userHistory/{userUid}")]
        public async Task<ActionResult<IEnumerable<object>>> GetUserBookingsHistory(Guid userUid)
        {
            await RefreshBookingStatusesByEndTimeAsync();

            var bookings = await _context.BookingsAdvanceds
                .Where(b => b.UserUid == userUid)
                .Select(b => new
                {
                    b.BookingUid,
                    b.UserUid,
                    b.RoomId,
                    b.InstrumentId,
                    
                    // --- НОВОЕ ПОЛЕ: передаем ID дополнительного оборудования ---
                    ExtraEquipmentIds = _context.BookingEquipments
                        .Where(be => be.BookingUid == b.BookingUid)
                        .Select(be => be.EquipmentId)
                        .Distinct()
                        .ToList(),

                    b.StartTime,
                    b.EndTime,
                    b.Status,
                    b.CreationDate,
                    TotalSum = _context.BillsAdvanceds
                        .Where(bill => bill.BookingUid == b.BookingUid)
                        .Select(bill => bill.TotalSum)
                        .FirstOrDefault(),
                    SubscriptionUsed = _context.BillsAdvanceds
                        .Where(bill => bill.BookingUid == b.BookingUid)
                        .Select(bill => bill.SubscriptionUsed)
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(bookings);
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

            // Сохраняем старые значения для уведомления
            var oldStartTime = booking.StartTime;
            var oldEndTime = booking.EndTime;

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

            // === СОЗДАНИЕ УВЕДОМЛЕНИЯ О ПЕРЕНОСЕ БРОНИРОВАНИЯ ===
            var roomName = "";
            var instrumentName = "";
            if (booking.RoomId.HasValue)
            {
                var room = await _context.Rooms.FindAsync(booking.RoomId);
                roomName = room?.Name ?? "Помещение";
            }
            else if (booking.InstrumentId.HasValue)
            {
                var instrument = await _context.Equipment.FindAsync(booking.InstrumentId);
                instrumentName = instrument?.Name ?? "Инструмент";
            }

            var itemType = booking.RoomId.HasValue ? "помещения" : "инструмента";
            var itemName = string.IsNullOrWhiteSpace(roomName) ? instrumentName : roomName;
            var oldStartTimeStr = oldStartTime?.ToString("dd.MM.yyyy HH:mm") ?? "";
            var oldEndTimeStr = oldEndTime?.ToString("dd.MM.yyyy HH:mm") ?? "";
            var newStartTimeStr = booking.StartTime?.ToString("dd.MM.yyyy HH:mm") ?? "";
            var newEndTimeStr = booking.EndTime?.ToString("dd.MM.yyyy HH:mm") ?? "";

            var rescheduleNotification = new Notification
            {
                UserUid = booking.UserUid.Value,
                BookingUid = booking.BookingUid,
                NotificationType = "booking_rescheduled",
                Title = "Бронирование перенесено",
                Message = $"Ваше бронирование {itemType} \"{itemName}\" перенесено с {oldStartTimeStr} – {oldEndTimeStr} на {newStartTimeStr} – {newEndTimeStr}.",
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };

            _context.Notifications.Add(rescheduleNotification);
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
            // 1. Инициализация бронирования
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

            booking.Status = booking.EndTime >= DateTime.Now ? "in progress" : "completed";

            // Назначение сотрудника
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

            // === ЛОГИКА АБОНЕМЕНТА (SUBSCRIPTION) ===
            var subscription = await _context.UserSubscriptionsAdvanceds
                .FirstOrDefaultAsync(s => s.UserUid == request.UserUid && 
                                        s.IsActive == true && 
                                        s.SessionsRemaining > 0 && 
                                        s.ValidUntil > DateTime.Now);

            decimal discountFactor = 1.0m;
            Guid? usedSubscriptionUid = null;

            if (subscription != null)
            {
                var plan = await _context.SubscriptionPlans.FindAsync(subscription.PlanId);
                if (plan != null)
                {
                    discountFactor = 1 - (plan.DiscountPercentage / 100.0m);
                }

                // Списываем сеанс
                subscription.SessionsRemaining -= 1;
                if (subscription.SessionsRemaining <= 0) subscription.IsActive = false;
                
                usedSubscriptionUid = subscription.SubscriptionUid;
            }

            // === СОЗДАНИЕ СЧЁТА ===
            var bill = new BillsAdvanced
            {
                BillUid = Guid.NewGuid(),
                BookingUid = booking.BookingUid,
                UserUid = booking.UserUid,
                TotalSum = 0,
                PaymentStatus = "not paid",
                CreationDate = DateTime.Now,
                SubscriptionUsed = subscription != null,
                SubscriptionUid = usedSubscriptionUid
            };

            _context.BookingsAdvanceds.Add(booking);
            _context.BillsAdvanceds.Add(bill);

            await _context.SaveChangesAsync();

            // === СОЗДАНИЕ УВЕДОМЛЕНИЯ О НОВОМ БРОНИРОВАНИИ ===
            var roomName = "";
            var instrumentName = "";
            if (booking.RoomId.HasValue)
            {
                var room = await _context.Rooms.FindAsync(booking.RoomId);
                roomName = room?.Name ?? "Помещение";
            }
            else if (booking.InstrumentId.HasValue)
            {
                var instrument = await _context.Equipment.FindAsync(booking.InstrumentId);
                instrumentName = instrument?.Name ?? "Инструмент";
            }

            var itemType = booking.RoomId.HasValue ? "помещения" : "инструмента";
            var itemName = string.IsNullOrWhiteSpace(roomName) ? instrumentName : roomName;
            var startTimeStr = booking.StartTime?.ToString("dd.MM.yyyy HH:mm") ?? "";
            var endTimeStr = booking.EndTime?.ToString("dd.MM.yyyy HH:mm") ?? "";

            var notification = new Notification
            {
                UserUid = booking.UserUid.Value,
                BookingUid = booking.BookingUid,
                NotificationType = "new_booking",
                Title = "Бронирование подтверждено",
                Message = $"Ваше бронирование {itemType} \"{itemName}\" на {startTimeStr} – {endTimeStr} успешно создано.",
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            // === ДОБАВЛЕНИЕ ОБОРУДОВАНИЯ ===
            if (request.SelectedEquipment != null && request.SelectedEquipment.Any())
            {
                var uniqueIds = request.SelectedEquipment.Distinct().ToList();
                var equipmentLinks = uniqueIds.Select(id => new BookingEquipment
                {
                    BookingUid = booking.BookingUid,
                    EquipmentId = id
                }).ToList();

                _context.BookingEquipments.AddRange(equipmentLinks);
                await _context.SaveChangesAsync();
            }

            // === РАСЧЕТ СТОИМОСТИ С УЧЕТОМ СКИДКИ ===
            var billItems = new List<BillItemsAdvanced>();
            decimal totalSum = 0;

            // 1. Основная позиция (Комната/Инструмент)
            if (booking.RoomId.HasValue)
            {
                var room = await _context.Rooms
                    .Include(r => r.RoomType)
                    .FirstOrDefaultAsync(r => r.RoomId == booking.RoomId);

                if (room != null)
                {
                    decimal price = room.RoomType?.RentalPricePerHour ?? 0m;
                    int hours = (int)Math.Ceiling((booking.EndTime.Value - booking.StartTime.Value).TotalHours);
                    if (hours < 1) hours = 1;

                    decimal itemTotal = (price * hours) * discountFactor;

                    billItems.Add(new BillItemsAdvanced
                    {
                        BillUid = bill.BillUid,
                        ItemType = "Room",
                        ItemName = $"Аренда: {room.Name} (со скидкой)",
                        Quantity = hours,
                        UnitPrice = price * discountFactor,
                        TotalPrice = itemTotal
                    });
                    totalSum += itemTotal;
                }
            }
            else if (booking.InstrumentId.HasValue)
            {
                var equipment = await _context.Equipment.FindAsync(booking.InstrumentId);
                if (equipment != null)
                {
                    decimal price = equipment.RentalPrice ?? 0m;
                    int days = (int)Math.Ceiling((booking.EndTime.Value - booking.StartTime.Value).TotalDays);
                    if (days < 1) days = 1;

                    decimal itemTotal = (price * days) * discountFactor;

                    billItems.Add(new BillItemsAdvanced
                    {
                        BillUid = bill.BillUid,
                        ItemType = "Instrument",
                        ItemName = $"Аренда: {equipment.Name} (со скидкой)",
                        Quantity = days,
                        UnitPrice = price * discountFactor,
                        TotalPrice = itemTotal
                    });
                    totalSum += itemTotal;
                }
            }

            // 2. Дополнительное оборудование (скидка распространяется на каждый пункт счёта)
            var addedEquipment = await _context.BookingEquipments
                .Where(be => be.BookingUid == booking.BookingUid)
                .Include(be => be.Equipment)
                .ToListAsync();

            foreach (var link in addedEquipment)
            {
                if (link.Equipment == null) continue;
                decimal eqPrice = link.Equipment.RentalPrice ?? 0m;
                decimal discountedEqPrice = eqPrice * discountFactor;
                decimal itemTotal = discountedEqPrice;
                totalSum += itemTotal;

                billItems.Add(new BillItemsAdvanced
                {
                    BillUid = bill.BillUid,
                    ItemType = "Equipment",
                    ItemName = discountFactor < 1.0m
                        ? $"Доп. оборудование: {link.Equipment.Name} (со скидкой)"
                        : $"Доп. оборудование: {link.Equipment.Name}",
                    Quantity = 1,
                    UnitPrice = discountedEqPrice,
                    TotalPrice = itemTotal
                });
            }

            // Обновление итоговой суммы
            bill.TotalSum = totalSum;
            _context.BillItemsAdvanceds.AddRange(billItems);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetBookingsAdvanced", new { id = booking.BookingUid }, new
            {
                booking.BookingUid,
                booking.Status,
                BillUid = bill.BillUid,
                TotalSum = bill.TotalSum,
                SubscriptionUsed = bill.SubscriptionUsed
            });
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
