namespace StakeholderCHIETA.Models
{
    public class Advisor: User
    {
        public string EmployeeID { get; set; }
        public string department {  get; set; }
        public EmployeeRole Role { get; set; }

    }
}
