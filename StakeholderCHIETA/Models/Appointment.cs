namespace StakeholderCHIETA.Models
{
    public class Appointment
    {
        public string AppointmentId { get; set; }
        public string ClientId { get; set; }
        public string ClientName { get; set; }
        public string AdvisorId { get; set; }
        public DateTime Date { get; set; }
        public string Purpose { get; set; }
        public string Status { get; set; } = "Pending";
    }
}
