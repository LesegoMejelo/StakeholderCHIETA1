using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StakeholderCHIETA.Models
{
    [Table("Enquiry")]
    public class Enquiries
    {
        [Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int EnquiryId { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public DateTime InquiryDate { get; set; }
        public EnquiryType TypeId { get; set; }
        public string Description { get; set; }
        public EnquiryStatus Status { get; set; }

    }
}
