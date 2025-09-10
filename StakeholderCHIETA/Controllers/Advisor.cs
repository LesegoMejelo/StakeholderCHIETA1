using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace StakeholderCHIETA.Controllers
{
    [Authorize(Roles = "Advisor")]
    public class AdvisorController : Controller
    {
        public IActionResult Home()
        {
            var userName = User.FindFirst(ClaimTypes.Name)?.Value;
            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;

            ViewBag.UserName = userName;
            ViewBag.UserEmail = userEmail;

            return View("~/Views/EmployeeViews/EmployeeLanding.cshtml");
        }

        // Inquiry Tracker Page
        public IActionResult InquiryTracker()
        {
            var userName = User.FindFirst(ClaimTypes.Name)?.Value;
            ViewBag.UserName = userName;

            return View("~/Views/EmployeeViews/InquiryTracker.cshtml");
        }

        // Appointment Tracker Page
        public IActionResult AppointmentTracker()
        {
            var userName = User.FindFirst(ClaimTypes.Name)?.Value;
            ViewBag.UserName = userName;

            return View("~/Views/EmployeeViews/AppointmentTracker.cshtml");
        }
    }
}
