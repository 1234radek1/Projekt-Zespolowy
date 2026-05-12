using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RaportApp.Contracts;
using RaportApp.Data;
using RaportApp.Models;

namespace RaportApp.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TemplatesController : ControllerBase
{
    private readonly AppDbContext _context;

    public TemplatesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ReportTemplate>>> GetTemplates()
    {
        var templates = await _context.ReportTemplates
            .AsNoTracking()
            .OrderByDescending(template => template.CreatedAt)
            .ToListAsync();

        return Ok(templates);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ReportTemplate>> GetTemplate(Guid id)
    {
        var template = await _context.ReportTemplates
            .AsNoTracking()
            .FirstOrDefaultAsync(template => template.Id == id);

        return template is null ? NotFound() : Ok(template);
    }

    [HttpPost]
    public async Task<ActionResult<ReportTemplate>> CreateTemplate(CreateReportTemplateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Template name is required.");
        }

        var template = new ReportTemplate
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            SchemaContent = request.SchemaContent,
            CreatedAt = DateTime.UtcNow,
        };

        _context.ReportTemplates.Add(template);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTemplate), new { id = template.Id }, template);
    }
}
