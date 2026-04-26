using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RaportApp.Data;
using RaportApp.Models;

namespace RaportApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // Adres to będzie: https://localhost:XXXX/api/templates
    public class TemplatesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TemplatesController(AppDbContext context)
        {
            _context = context;
        }

        // 1. Pobieranie wszystkich szablonów z bazy
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ReportTemplate>>> GetTemplates()
        {
            return await _context.ReportTemplates.ToListAsync();
        }

        // 2. Zapisywanie nowego szablonu
        [HttpPost]
        public async Task<ActionResult<ReportTemplate>> SaveTemplate(ReportTemplate template)
        {
            // Nadajemy nowe ID
            template.Id = Guid.NewGuid();
            template.CreatedAt = DateTime.UtcNow;

            _context.ReportTemplates.Add(template);
            await _context.SaveChangesAsync();

            return Ok(template);
        }
    }
}