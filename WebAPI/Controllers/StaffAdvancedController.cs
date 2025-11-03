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
    public class StaffAdvancedController : ControllerBase
    {
        private readonly PracticeProjectContext _context;

        public StaffAdvancedController(PracticeProjectContext context)
        {
            _context = context;
        }

        // GET: api/StaffAdvanced
        [HttpGet]
        public async Task<ActionResult<IEnumerable<StaffAdvanced>>> GetStaffAdvanceds()
        {
            return await _context.StaffAdvanceds.ToListAsync();
        }

        // GET: api/StaffAdvanced/5
        [HttpGet("{id}")]
        public async Task<ActionResult<StaffAdvanced>> GetStaffAdvanced(Guid id)
        {
            var staffAdvanced = await _context.StaffAdvanceds.FindAsync(id);

            if (staffAdvanced == null)
            {
                return NotFound();
            }

            return staffAdvanced;
        }

        // PUT: api/StaffAdvanced/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutStaffAdvanced(Guid id, StaffAdvanced staffAdvanced)
        {
            if (id != staffAdvanced.StaffUid)
            {
                return BadRequest();
            }

            _context.Entry(staffAdvanced).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!StaffAdvancedExists(id))
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

        // POST: api/StaffAdvanced
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<StaffAdvanced>> PostStaffAdvanced(StaffAdvanced staffAdvanced)
        {
            _context.StaffAdvanceds.Add(staffAdvanced);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetStaffAdvanced", new { id = staffAdvanced.StaffUid }, staffAdvanced);
        }

        // DELETE: api/StaffAdvanced/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStaffAdvanced(Guid id)
        {
            var staffAdvanced = await _context.StaffAdvanceds.FindAsync(id);
            if (staffAdvanced == null)
            {
                return NotFound();
            }

            _context.StaffAdvanceds.Remove(staffAdvanced);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool StaffAdvancedExists(Guid id)
        {
            return _context.StaffAdvanceds.Any(e => e.StaffUid == id);
        }
    }
}
