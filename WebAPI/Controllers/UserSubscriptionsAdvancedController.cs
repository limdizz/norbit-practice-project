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

        [HttpGet("active/{userId}")]
        public async Task<ActionResult> GetActiveSubscription(Guid userId)
        {
            var subscription = await _context.UserSubscriptionsAdvanceds
                .Include(s => s.Plan)
                .Where(s => s.UserUid == userId && s.IsActive == true && s.ValidUntil > DateTime.Now)
                .OrderByDescending(s => s.PurchaseDate)
                .FirstOrDefaultAsync();

            if (subscription == null) return NotFound();

            // Явно возвращаем нужные поля, включая PlanId
            return Ok(new
            {
                subscriptionUid = subscription.SubscriptionUid,
                planId = subscription.PlanId, // Проверьте, что это поле заполнено в БД
                planName = subscription.Plan?.PlanName,
                sessionsRemaining = subscription.SessionsRemaining,
                validUntil = subscription.ValidUntil,
                isActive = subscription.IsActive
            });
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
        public async Task<ActionResult<UserSubscriptionsAdvanced>> PostUserSubscriptionsAdvanced(UserSubscriptionsAdvanced subscription)
        {
            // 1. Игнорируем время с фронтенда и ставим серверное (если сервер в РФ)
            // Либо принудительно вычисляем московское время:
            DateTime utcNow = DateTime.UtcNow;
            TimeZoneInfo moscowTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Russian Standard Time");
            DateTime moscowTime = TimeZoneInfo.ConvertTimeFromUtc(utcNow, moscowTimeZone);

            subscription.PurchaseDate = moscowTime;

            // 2. Рассчитываем дату окончания тоже здесь (так надежнее)
            // Допустим, вы получаете количество дней из плана в базе
            var plan = await _context.SubscriptionPlans.FindAsync(subscription.PlanId);
            if (plan != null)
            {
                subscription.ValidUntil = moscowTime.AddDays((double)plan.ValidityDays);
            }

            // 3. Убираем флаг UTC для PostgreSQL (как мы делали ранее)
            subscription.PurchaseDate = DateTime.SpecifyKind((DateTime)subscription.PurchaseDate, DateTimeKind.Unspecified);
            subscription.ValidUntil = DateTime.SpecifyKind((DateTime)subscription.ValidUntil, DateTimeKind.Unspecified);

            _context.UserSubscriptionsAdvanceds.Add(subscription);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetUserSubscriptionsAdvanced", new { id = subscription.SubscriptionUid }, subscription);
        }

        [HttpPost("cancel/{userId}")]
        public async Task<IActionResult> CancelActiveSubscription(Guid userId)
        {
            // Find the active subscription for this user
            var activeSub = await _context.UserSubscriptionsAdvanceds
                .Where(s => s.UserUid == userId && s.IsActive == true)
                .OrderByDescending(s => s.PurchaseDate)
                .FirstOrDefaultAsync();

            if (activeSub == null)
            {
                return NotFound("Активная подписка не найдена.");
            }

            // Deactivate it
            activeSub.IsActive = false;

            // Mark the entity as modified
            _context.Entry(activeSub).State = EntityState.Modified;

            await _context.SaveChangesAsync();

            return Ok("Подписка успешно отменена.");
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
