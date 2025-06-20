namespace StakeholderCHIETA.Models
{
    public class Enquiries
    {
        public int EnquiryId { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public DateTime InquiryDate { get; set; }
        public string InquiryType { get; set; }
        public string Description { get; set; }
        public EnquiryStatus Status { get; set; }

    }
}
