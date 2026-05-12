using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RaportApp.Data;
using RaportApp.Models;

namespace RaportApp.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DataController : ControllerBase
{
    private readonly AppDbContext _context;

    public DataController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("clients")]
    public async Task<ActionResult<IEnumerable<Client>>> GetClients()
    {
        var clients = await _context.Clients
            .AsNoTracking()
            .OrderBy(client => client.Name)
            .ToListAsync();

        return Ok(clients);
    }
}
