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
    public class BillItemsController : ControllerBase
    {
        private readonly PracticeProjectContext _context;

        public BillItemsController(PracticeProjectContext context)
        {
            _context = context;
        }

        // GET: api/BillItems
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BillItem>>> GetBillItems()
        {
            return await _context.BillItems.ToListAsync();
        }

        // GET: api/BillItems/5
        [HttpGet("{id}")]
        public async Task<ActionResult<BillItem>> GetBillItem(int id)
        {
            var billItem = await _context.BillItems.FindAsync(id);

            if (billItem == null)
            {
                return NotFound();
            }

            return billItem;
        }

        // PUT: api/BillItems/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutBillItem(int id, BillItem billItem)
        {
            if (id != billItem.BillItemId)
            {
                return BadRequest();
            }

            _context.Entry(billItem).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!BillItemExists(id))
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

        // POST: api/BillItems
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<BillItem>> PostBillItem(BillItem billItem)
        {
            _context.BillItems.Add(billItem);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetBillItem", new { id = billItem.BillItemId }, billItem);
        }

        // DELETE: api/BillItems/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBillItem(int id)
        {
            var billItem = await _context.BillItems.FindAsync(id);
            if (billItem == null)
            {
                return NotFound();
            }

            _context.BillItems.Remove(billItem);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool BillItemExists(int id)
        {
            return _context.BillItems.Any(e => e.BillItemId == id);
        }
    }
}
