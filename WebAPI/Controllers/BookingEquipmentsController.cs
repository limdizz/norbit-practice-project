using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAPI.Models;

namespace WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BookingEquipmentsController : ControllerBase
    {
        private readonly PracticeProjectContext _context;

        public BookingEquipmentsController(PracticeProjectContext context)
        {
            _context = context;
        }

        // GET: api/BookingEquipments
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BookingEquipment>>> GetBookingEquipments()
        {
            return await _context.BookingEquipments.ToListAsync();
        }

        // GET: api/BookingEquipments/5
        [HttpGet("{id}")]
        public async Task<ActionResult<BookingEquipment>> GetBookingEquipment(int id)
        {
            var bookingEquipment = await _context.BookingEquipments.FindAsync(id);

            if (bookingEquipment == null)
            {
                return NotFound();
            }

            return bookingEquipment;
        }

        // PUT: api/BookingEquipments/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutBookingEquipment(int id, BookingEquipment bookingEquipment)
        {
            if (id != bookingEquipment.BookingEquipmentId)
            {
                return BadRequest();
            }

            _context.Entry(bookingEquipment).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!BookingEquipmentExists(id))
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

        // POST: api/BookingEquipments
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<BookingEquipment>> PostBookingEquipment(BookingEquipment bookingEquipment)
        {
            _context.BookingEquipments.Add(bookingEquipment);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetBookingEquipment", new { id = bookingEquipment.BookingEquipmentId }, bookingEquipment);
        }

        // DELETE: api/BookingEquipments/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBookingEquipment(int id)
        {
            var bookingEquipment = await _context.BookingEquipments.FindAsync(id);
            if (bookingEquipment == null)
            {
                return NotFound();
            }

            _context.BookingEquipments.Remove(bookingEquipment);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool BookingEquipmentExists(int id)
        {
            return _context.BookingEquipments.Any(e => e.BookingEquipmentId == id);
        }
    }
}
