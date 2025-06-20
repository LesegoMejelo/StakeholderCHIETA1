using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StakeholderCHIETA.Models
{
    
    public class EnquiryStatus
    {
        public enum Status
        {
            Pending,
            InProgress,
            Resolved
        }
        [Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int StatusId { get; set; }
        public string status {  get; set; }
       // public ICollection<Enquiries> Enquiry { get; set; }
    }
}
