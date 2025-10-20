using System.ComponentModel.DataAnnotations;

namespace Staekholder_CHIETA_X.Models.DTOs.Inquiries
{
    public sealed class StatusDto
    {
        [Required] public string Status { get; set; } = "";
        public string Notes { get; set; } = "";
    }
}
