using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StakeholderCHIETA.Models
{
    public enum Status
    {
        Pending,
        InProgress,
        Resolved
    }
    public class EnquiryStatus
    {
        [Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int StatusId { get; set; }
        [Required]
        public string status {  get; set; }
    }
}
