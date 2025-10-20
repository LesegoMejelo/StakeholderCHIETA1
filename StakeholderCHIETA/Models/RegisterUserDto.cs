using System.ComponentModel.DataAnnotations;

namespace StakeholderCHIETA_X.Models.DTOs.Auth
{
    public class RegisterUserDto
    {
        [EmailAddress, Required] public string Email { get; set; }
        [Required, MinLength(6)] public string Password { get; set; }
        [Required] public string Name { get; set; }
        [Required] public string Role { get; set; }
        public string Status { get; set; }
    }
}

