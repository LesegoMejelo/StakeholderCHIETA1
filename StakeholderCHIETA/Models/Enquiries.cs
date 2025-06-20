using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StakeholderCHIETA.Models
{
    [Table("Enquiry")]
    public class Enquiries
    {
        [Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int EnquiryId { get; set; }
        public string firstName { get; set; }
        public string surname { get; set; }
        public string email { get; set; }
        public DateTime dateSubmitted { get; set; }
        public EnquiryType type { get; set; }
        public string description { get; set; }
        public EnquiryStatus Status { get; set; }

    }
}
