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
    public class BillsAdvancedController : ControllerBase
    {
        private readonly PracticeProjectContext _context;

        public BillsAdvancedController(PracticeProjectContext context)
        {
            _context = context;
        }

        // GET: api/BillsAdvanceds
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BillsAdvanced>>> GetBillsAdvanceds()
        {
            return await _context.BillsAdvanceds.ToListAsync();
        }

        // GET: api/BillsAdvanceds/5
        [HttpGet("{id}")]
        public async Task<ActionResult<BillsAdvanced>> GetBillsAdvanced(Guid id)
        {
            var billsAdvanced = await _context.BillsAdvanceds.FindAsync(id);

            if (billsAdvanced == null)
            {
                return NotFound();
            }

            return billsAdvanced;
        }

        // PUT: api/BillsAdvanceds/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutBillsAdvanced(Guid id, BillsAdvanced billsAdvanced)
        {
            if (id != billsAdvanced.BillUid)
            {
                return BadRequest();
            }

            _context.Entry(billsAdvanced).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!BillsAdvancedExists(id))
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

        // POST: api/BillsAdvanceds
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<BillsAdvanced>> PostBillsAdvanced(BillsAdvanced billsAdvanced)
        {
            _context.BillsAdvanceds.Add(billsAdvanced);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetBillsAdvanced", new { id = billsAdvanced.BillUid }, billsAdvanced);
        }

        // DELETE: api/BillsAdvanceds/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBillsAdvanced(Guid id)
        {
            var billsAdvanced = await _context.BillsAdvanceds.FindAsync(id);
            if (billsAdvanced == null)
            {
                return NotFound();
            }

            _context.BillsAdvanceds.Remove(billsAdvanced);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool BillsAdvancedExists(Guid id)
        {
            return _context.BillsAdvanceds.Any(e => e.BillUid == id);
        }
    }
}
