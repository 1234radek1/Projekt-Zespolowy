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

        // 3. Aktualizacja istniejącego szablonu
        [HttpPut("{id}")]
        public async Task<ActionResult<ReportTemplate>> UpdateTemplate(Guid id, ReportTemplate template)
        {
            if (id != template.Id)
            {
                return BadRequest("ID mismatch");
            }

            var existing = await _context.ReportTemplates.FindAsync(id);
            if (existing == null)
            {
                return NotFound();
            }

            existing.Name = template.Name;
            existing.SchemaContent = template.SchemaContent;

            await _context.SaveChangesAsync();

            return Ok(existing);
        }

        // 4. Usuwanie istniejącego szablonu
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTemplate(Guid id)
        {
            var template = await _context.ReportTemplates.FindAsync(id);
            if (template == null)
            {
                return NotFound();
            }

            _context.ReportTemplates.Remove(template);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}