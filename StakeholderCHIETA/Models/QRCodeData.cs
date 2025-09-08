namespace StakeholderCHIETA.Models
{
    public class QRCodeData
    {

        public string AppointmentId { get; set; }
        public string ClientId { get; set; }
        public DateTime ExpiryTime { get; set; }
        public string ValidationToken { get; set; }
        public DateTime AppointmentDate { get; set; }
        public string AppointmentTime { get; set; }
        public object UserId { get; internal set; }
    }
}
