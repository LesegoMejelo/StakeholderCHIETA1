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

        public int SelectedProvinceId { get; set; }      // bound to province select
        public int SelectedAdvisorId { get; set; }       // bound to advisor select

        public List<SelectListItem> Provinces { get; set; } = new();
       // public List<SelectListItem> Advisors { get; set; } = new();
    }
}

