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

        // GET: api/BookingsAdvanced
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BookingsAdvanced>>> GetBookingsAdvanceds()
        {
            return await _context.BookingsAdvanceds.ToListAsync();
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

        private bool BookingsAdvancedExists(Guid id)
        {
            return _context.BookingsAdvanceds.Any(e => e.BookingUid == id);
        }
    }
}
