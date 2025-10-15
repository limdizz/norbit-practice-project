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
    public class UserSubscriptionsController : ControllerBase
    {
        private readonly PracticeProjectContext _context;

        public UserSubscriptionsController(PracticeProjectContext context)
        {
            _context = context;
        }

        // GET: api/UserSubscriptions
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserSubscription>>> GetUserSubscriptions()
        {
            return await _context.UserSubscriptions.ToListAsync();
        }

        // GET: api/UserSubscriptions/5
        [HttpGet("{id}")]
        public async Task<ActionResult<UserSubscription>> GetUserSubscription(int id)
        {
            var userSubscription = await _context.UserSubscriptions.FindAsync(id);

            if (userSubscription == null)
            {
                return NotFound();
            }

            return userSubscription;
        }

        // PUT: api/UserSubscriptions/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutUserSubscription(int id, UserSubscription userSubscription)
        {
            if (id != userSubscription.SubscriptionId)
            {
                return BadRequest();
            }

            _context.Entry(userSubscription).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!UserSubscriptionExists(id))
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

        // POST: api/UserSubscriptions
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<UserSubscription>> PostUserSubscription(UserSubscription userSubscription)
        {
            _context.UserSubscriptions.Add(userSubscription);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                if (UserSubscriptionExists(userSubscription.SubscriptionId))
                {
                    return Conflict();
                }
                else
                {
                    throw;
                }
            }

            return CreatedAtAction("GetUserSubscription", new { id = userSubscription.SubscriptionId }, userSubscription);
        }

        // DELETE: api/UserSubscriptions/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUserSubscription(int id)
        {
            var userSubscription = await _context.UserSubscriptions.FindAsync(id);
            if (userSubscription == null)
            {
                return NotFound();
            }

            _context.UserSubscriptions.Remove(userSubscription);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool UserSubscriptionExists(int id)
        {
            return _context.UserSubscriptions.Any(e => e.SubscriptionId == id);
        }
    }
}
