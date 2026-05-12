using Microsoft.EntityFrameworkCore;
using RaportApp.Models;

namespace RaportApp.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<ReportTemplate> ReportTemplates => Set<ReportTemplate>();

    public DbSet<Client> Clients => Set<Client>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Client>().HasData(
            new Client { Id = 1, Name = "Budimex S.A.", City = "Warszawa", Email = "biuro@budimex.pl" },
            new Client { Id = 2, Name = "Orlen S.A.", City = "Płock", Email = "kontakt@orlen.pl" },
            new Client { Id = 3, Name = "InPost Sp. z o.o.", City = "Kraków", Email = "info@inpost.pl" }
        );
    }
}
