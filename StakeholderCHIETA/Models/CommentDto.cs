using System.ComponentModel.DataAnnotations;

namespace Staekholder_CHIETA_X.Models.DTOs.Inquiries
{
    public sealed class CommentDto
    {
        [Required] public string Text { get; set; } = "";
    }
}
