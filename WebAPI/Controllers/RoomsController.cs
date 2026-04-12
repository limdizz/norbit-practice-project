using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoomsController : ControllerBase
    {
        private readonly PracticeProjectContext _context;

        public RoomsController(PracticeProjectContext context)
        {
            _context = context;
        }

        // GET: api/Rooms
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Room>>> GetRooms()
        {
            return await _context.Rooms.ToListAsync();
        }

        // GET: api/Rooms/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Room>> GetRoom(int id)
        {
            var room = await _context.Rooms.FindAsync(id);

            if (room == null)
            {
                return NotFound();
            }

            return room;
        }

        public class UpdateRoomDto
        {
            public string Name { get; set; }
            public int RoomTypeId { get; set; }
            public bool IsFree { get; set; }
        }

        // PUT: api/Rooms/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRoom(int id, [FromBody] UpdateRoomDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Проверяем, существует ли помещение
            var room = await _context.Rooms.FindAsync(id);
            if (room == null)
            {
                return NotFound(new { message = $"Помещение с ID {id} не найдено." });
            }

            // Проверяем, существует ли тип помещения
            var roomTypeExists = await _context.RoomTypes.AnyAsync(rt => rt.RoomTypeId == dto.RoomTypeId);
            if (!roomTypeExists)
            {
                return BadRequest($"Тип помещения с ID {dto.RoomTypeId} не существует.");
            }

            // Обновляем только поля
            room.Name = dto.Name;
            room.RoomTypeId = dto.RoomTypeId;
            room.IsFree = dto.IsFree;

            try
            {
                await _context.SaveChangesAsync();
                return Ok(room); // Возвращаем обновлённый объект
            }
            catch (Exception ex)
            {
                // Логируйте ex при необходимости
                return StatusCode(500, new { message = "Ошибка при сохранении изменений." });
            }
        }

        // POST: api/Rooms
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        // DTO для создания помещения
        public class CreateRoomDto
        {
            public string Name { get; set; }
            public int RoomTypeId { get; set; }
            public bool? IsFree { get; set; }
        }

        [HttpPost]
        public async Task<ActionResult<Room>> PostRoom(CreateRoomDto roomDto)
        {
            var roomType = await _context.RoomTypes.FindAsync(roomDto.RoomTypeId);
            if (roomType == null)
            {
                return BadRequest($"Тип помещения с ID {roomDto.RoomTypeId} не существует.");
            }
            
            var room = new Room
            {
                Name = roomDto.Name,
                RoomTypeId = roomDto.RoomTypeId,
                IsFree = roomDto.IsFree ?? true
            };
            
            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetRoom", new { id = room.RoomId }, room);
        }

        // DELETE: api/Rooms/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRoom(int id)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null)
            {
                return NotFound();
            }

            _context.Rooms.Remove(room);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool RoomExists(int id)
        {
            return _context.Rooms.Any(e => e.RoomId == id);
        }
    }
}
