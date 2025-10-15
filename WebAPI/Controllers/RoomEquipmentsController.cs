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
    public class RoomEquipmentsController : ControllerBase
    {
        private readonly PracticeProjectContext _context;

        public RoomEquipmentsController(PracticeProjectContext context)
        {
            _context = context;
        }

        // GET: api/RoomEquipments
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RoomEquipment>>> GetRoomEquipments()
        {
            return await _context.RoomEquipments.ToListAsync();
        }

        // GET: api/RoomEquipments/5
        [HttpGet("{id}")]
        public async Task<ActionResult<RoomEquipment>> GetRoomEquipment(int id)
        {
            var roomEquipment = await _context.RoomEquipments.FindAsync(id);

            if (roomEquipment == null)
            {
                return NotFound();
            }

            return roomEquipment;
        }

        // PUT: api/RoomEquipments/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutRoomEquipment(int id, RoomEquipment roomEquipment)
        {
            if (id != roomEquipment.RoomId)
            {
                return BadRequest();
            }

            _context.Entry(roomEquipment).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!RoomEquipmentExists(id))
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

        // POST: api/RoomEquipments
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<RoomEquipment>> PostRoomEquipment(RoomEquipment roomEquipment)
        {
            _context.RoomEquipments.Add(roomEquipment);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetRoomEquipment", new { id = roomEquipment.RoomId }, roomEquipment);
        }

        // DELETE: api/RoomEquipments/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRoomEquipment(int id)
        {
            var roomEquipment = await _context.RoomEquipments.FindAsync(id);
            if (roomEquipment == null)
            {
                return NotFound();
            }

            _context.RoomEquipments.Remove(roomEquipment);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool RoomEquipmentExists(int id)
        {
            return _context.RoomEquipments.Any(e => e.RoomId == id);
        }
    }
}
