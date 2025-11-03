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
    public class BillItemsAdvancedController : ControllerBase
    {
        private readonly PracticeProjectContext _context;

        public BillItemsAdvancedController(PracticeProjectContext context)
        {
            _context = context;
        }

        // GET: api/BillItemsAdvanced
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BillItemsAdvanced>>> GetBillItemsAdvanceds()
        {
            return await _context.BillItemsAdvanceds.ToListAsync();
        }

        // GET: api/BillItemsAdvanced/5
        [HttpGet("{id}")]
        public async Task<ActionResult<BillItemsAdvanced>> GetBillItemsAdvanced(int id)
        {
            var billItemsAdvanced = await _context.BillItemsAdvanceds.FindAsync(id);

            if (billItemsAdvanced == null)
            {
                return NotFound();
            }

            return billItemsAdvanced;
        }

        // PUT: api/BillItemsAdvanced/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutBillItemsAdvanced(int id, BillItemsAdvanced billItemsAdvanced)
        {
            if (id != billItemsAdvanced.BillItemId)
            {
                return BadRequest();
            }

            _context.Entry(billItemsAdvanced).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!BillItemsAdvancedExists(id))
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

        // POST: api/BillItemsAdvanced
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<BillItemsAdvanced>> PostBillItemsAdvanced(BillItemsAdvanced billItemsAdvanced)
        {
            _context.BillItemsAdvanceds.Add(billItemsAdvanced);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                if (BillItemsAdvancedExists(billItemsAdvanced.BillItemId))
                {
                    return Conflict();
                }
                else
                {
                    throw;
                }
            }

            return CreatedAtAction("GetBillItemsAdvanced", new { id = billItemsAdvanced.BillItemId }, billItemsAdvanced);
        }

        // DELETE: api/BillItemsAdvanced/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBillItemsAdvanced(int id)
        {
            var billItemsAdvanced = await _context.BillItemsAdvanceds.FindAsync(id);
            if (billItemsAdvanced == null)
            {
                return NotFound();
            }

            _context.BillItemsAdvanceds.Remove(billItemsAdvanced);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool BillItemsAdvancedExists(int id)
        {
            return _context.BillItemsAdvanceds.Any(e => e.BillItemId == id);
        }
    }
}
