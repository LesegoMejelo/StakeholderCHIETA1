using Microsoft.AspNetCore.Mvc.Rendering;
using System.ComponentModel.DataAnnotations;

namespace StakeholderCHIETA.Models
{
    public class AppointmentViewModel
    {
        [Required]
        [Display(Name = "Advisor")]
        public string AdvisorId { get; set; }
        public List<SelectListItem> Advisors { get; set; }

        [Required]
        [StringLength(250)]
        public string Reason { get; set; }

        [Required]
        [DataType(DataType.Date)]
        public DateTime Date { get; set; }

        [Required]
        [DataType(DataType.Time)]
        public TimeSpan Time { get; set; }
    }
}
