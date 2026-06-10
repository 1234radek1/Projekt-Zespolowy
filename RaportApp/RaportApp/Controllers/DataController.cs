using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RaportApp.Data;

namespace RaportApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DataController : ControllerBase
    {
        private readonly AppDbContext _context;

        // Wstrzykujemy bazę danych do kontrolera
        public DataController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("clients")]
        public async Task<IActionResult> GetClients()
        {
            // Pobieramy prawdziwą listę z PostgreSQL
            var clients = await _context.Clients.ToListAsync();
            return Ok(clients);
        }
    }
}