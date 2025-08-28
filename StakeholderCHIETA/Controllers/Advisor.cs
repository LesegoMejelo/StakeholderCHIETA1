using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StakeholderCHIETA.Controllers
{
    [Authorize(Roles = "Advisor")]
    public class AdvisorController : Controller
    {
        public IActionResult Home()
        {
            // Load advisor-specific data from Firestore
            return View("~/Views/EmployeeViews/Home/EmployeeLanding.cshtml");
        }
    }
    }
