using System.ComponentModel.DataAnnotations;

namespace RaportApp.Contracts;

public class CreateReportTemplateRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string SchemaContent { get; set; } = "{}";
}
