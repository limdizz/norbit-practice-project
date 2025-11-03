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
    public class UsersAdvancedController : ControllerBase
    {
        private readonly PracticeProjectContext _context;

        public UsersAdvancedController(PracticeProjectContext context)
        {
            _context = context;
        }

        // GET: api/UsersAdvanced
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UsersAdvanced>>> GetUsersAdvanceds()
        {
            return await _context.UsersAdvanceds.ToListAsync();
        }

        // GET: api/UsersAdvanced/5
        [HttpGet("{id}")]
        public async Task<ActionResult<UsersAdvanced>> GetUsersAdvanced(Guid id)
        {
            var usersAdvanced = await _context.UsersAdvanceds.FindAsync(id);

            if (usersAdvanced == null)
            {
                return NotFound();
            }

            return usersAdvanced;
        }

        // PUT: api/UsersAdvanced/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutUsersAdvanced(Guid id, UsersAdvanced usersAdvanced)
        {
            if (id != usersAdvanced.UserUid)
            {
                return BadRequest();
            }

            _context.Entry(usersAdvanced).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!UsersAdvancedExists(id))
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

        // POST: api/UsersAdvanced
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<UsersAdvanced>> PostUsersAdvanced(UsersAdvanced usersAdvanced)
        {
            _context.UsersAdvanceds.Add(usersAdvanced);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetUsersAdvanced", new { id = usersAdvanced.UserUid }, usersAdvanced);
        }

        // DELETE: api/UsersAdvanced/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUsersAdvanced(Guid id)
        {
            var usersAdvanced = await _context.UsersAdvanceds.FindAsync(id);
            if (usersAdvanced == null)
            {
                return NotFound();
            }

            _context.UsersAdvanceds.Remove(usersAdvanced);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool UsersAdvancedExists(Guid id)
        {
            return _context.UsersAdvanceds.Any(e => e.UserUid == id);
        }
    }
}
