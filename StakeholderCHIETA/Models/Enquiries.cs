using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StakeholderCHIETA.Models
{

    public enum enquiryType
    {
        feedbackFolllowUp,
        trainingAvailability,
        accreditationAndCompliance,
        fundingAndGrants,
        boardroomFacilityUse,
    }

    


    [Table("Enquiry")]

  
    public class Enquiries
    {
        [Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int enquiryId { get; set; }
        public string firstName { get; set; }
        public string lastName { get; set; }
        public string email { get; set; }
        public DateTime dateSubmitted { get; set; }
        public enquiryType type { get; set; }
        public string description { get; set; }
        public Status Status { get; set; }

    }
}
