using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace StakeholderCHIETA.Models
{
    public class Stakeholder : User
    {
        [Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public string stakeholderId { get; set; }
        [Required]
        public string organisationName { get; set; }
        public string contactMethod { get; set; }
    }
}
