using System.ComponentModel.DataAnnotations;

namespace RaportApp.Models
{
    public class Client
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public string City { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;
    }
}