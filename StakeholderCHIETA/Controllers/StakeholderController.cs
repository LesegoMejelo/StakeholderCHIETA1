using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using StakeholderCHIETA.Filters;
using Microsoft.AspNetCore.Authorization;

namespace StakeholderCHIETA.Controllers
{
    [Authorize(Roles = "Client")]
    public class StakeholderController : Controller
    {
        public IActionResult Index()
        {
            return View(); // Corresponds to Index.cshtml
        }

        public IActionResult Home()
        {
            return View("~/Views/StakeholderViews/Home/Home.cshtml"); // Corresponds to Home.cshtml
        }

  

        public IActionResult LogInquiry()
        {
            return View("~/Views/StakeholderViews/Inquiry/Inquiry.cshtml"); // Corresponds to LogInquiry.cshtml
        }

        public IActionResult Appointment()
        {
            return View("~/Views/StakeholderViews/Appointment/Appointment.cshtml"); // Corresponds to Appointment.cshtml
        }
    }
}
