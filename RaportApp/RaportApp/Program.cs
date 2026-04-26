using Microsoft.EntityFrameworkCore;
using RaportApp.Data;

var builder = WebApplication.CreateBuilder(args);

// 1. Połączenie z PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Automatyczne aplikowanie migracji bazy przy starcie (ważne przy używaniu Dockera!)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<RaportApp.Data.AppDbContext>();
    db.Database.Migrate();
}

// 3. Kolejność Middleware 
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

// app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
