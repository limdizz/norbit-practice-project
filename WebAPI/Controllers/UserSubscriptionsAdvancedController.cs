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
    public class UserSubscriptionsAdvancedController : ControllerBase
    {
        private readonly PracticeProjectContext _context;

        public UserSubscriptionsAdvancedController(PracticeProjectContext context)
        {
            _context = context;
        }

        // GET: api/UserSubscriptionsAdvanced
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserSubscriptionsAdvanced>>> GetUserSubscriptionsAdvanceds()
        {
            return await _context.UserSubscriptionsAdvanceds.ToListAsync();
        }

        // GET: api/UserSubscriptionsAdvanced/5
        [HttpGet("{id}")]
        public async Task<ActionResult<UserSubscriptionsAdvanced>> GetUserSubscriptionsAdvanced(Guid id)
        {
            var userSubscriptionsAdvanced = await _context.UserSubscriptionsAdvanceds.FindAsync(id);

            if (userSubscriptionsAdvanced == null)
            {
                return NotFound();
            }

            return userSubscriptionsAdvanced;
        }

        // PUT: api/UserSubscriptionsAdvanced/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutUserSubscriptionsAdvanced(Guid id, UserSubscriptionsAdvanced userSubscriptionsAdvanced)
        {
            if (id != userSubscriptionsAdvanced.SubscriptionUid)
            {
                return BadRequest();
            }

            _context.Entry(userSubscriptionsAdvanced).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!UserSubscriptionsAdvancedExists(id))
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

        // POST: api/UserSubscriptionsAdvanced
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<UserSubscriptionsAdvanced>> PostUserSubscriptionsAdvanced(UserSubscriptionsAdvanced userSubscriptionsAdvanced)
        {
            _context.UserSubscriptionsAdvanceds.Add(userSubscriptionsAdvanced);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetUserSubscriptionsAdvanced", new { id = userSubscriptionsAdvanced.SubscriptionUid }, userSubscriptionsAdvanced);
        }

        // DELETE: api/UserSubscriptionsAdvanced/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUserSubscriptionsAdvanced(Guid id)
        {
            var userSubscriptionsAdvanced = await _context.UserSubscriptionsAdvanceds.FindAsync(id);
            if (userSubscriptionsAdvanced == null)
            {
                return NotFound();
            }

            _context.UserSubscriptionsAdvanceds.Remove(userSubscriptionsAdvanced);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool UserSubscriptionsAdvancedExists(Guid id)
        {
            return _context.UserSubscriptionsAdvanceds.Any(e => e.SubscriptionUid == id);
        }
    }
}
