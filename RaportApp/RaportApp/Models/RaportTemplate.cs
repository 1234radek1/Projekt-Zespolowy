using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RaportApp.Models
{
    public class ReportTemplate
    {
        [Key]
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;

     
        [Column(TypeName = "jsonb")]
        public string SchemaContent { get; set; } = "{}";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}