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
            var exists = await _context.UsersAdvanceds
            .AnyAsync(u => u.Email == usersAdvanced.Email);

            if (exists)
            {
                return Conflict("Пользователь с такой почтой уже существует.");
            }

            var salt = await _context.Database.SqlQueryRaw<string>("SELECT gen_salt('bf', 8) as \"Value\"").FirstOrDefaultAsync();

            var hash = await _context.Database
                .SqlQueryRaw<string>(
                    "SELECT crypt({0}, {1}) as \"Value\"",
                    usersAdvanced.PasswordOrigin,
                    salt
                )
                .FirstOrDefaultAsync();

            usersAdvanced.UserUid = Guid.NewGuid();
            usersAdvanced.PasswordSalt = salt;
            usersAdvanced.PasswordHash = hash;
            usersAdvanced.RegistrationDate = DateTime.Now;

            _context.UsersAdvanceds.Add(usersAdvanced);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUsersAdvanced), new { id = usersAdvanced.UserUid }, usersAdvanced);
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

        // POST: api/UsersAdvanced/login
        [HttpPost("login")]
        public async Task<ActionResult<UsersAdvanced>> Login([FromBody] LoginRequest loginRequest)
        {
            if (loginRequest == null || string.IsNullOrEmpty(loginRequest.Email) || string.IsNullOrEmpty(loginRequest.Password))
            {
                return BadRequest("Не указан email или пароль.");
            }

            var user = await _context.UsersAdvanceds
                .FirstOrDefaultAsync(u => u.Email == loginRequest.Email);

            if (user == null)
            {
                return Unauthorized("Пользователь с таким email не найден.");
            }

            var computedHash = await _context.Database
                .SqlQueryRaw<string>(
                    "SELECT crypt({0}, {1}) as \"Value\"",
                    loginRequest.Password,
                    user.PasswordSalt
                )
                .FirstOrDefaultAsync();

            if (computedHash != user.PasswordHash)
            {
                return Unauthorized("Неверный пароль.");
            }

            return Ok(user);
        }

        public class LoginRequest
        {
            public required string Email { get; set; }
            public required string Password { get; set; }
        }
    }
}
