// AdvisorController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims; // Import this namespace
using StakeholderCHIETA.Filters;

namespace StakeholderCHIETA.Controllers
{
    [Authorize(Roles = "Advisor")]
    public class AdvisorController : Controller
    {
        public IActionResult Home()
        {
            // Retrieve user claims from the authenticated principal
            var userName = User.FindFirst(ClaimTypes.Name)?.Value;
            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;

            // Use ViewBag to pass data to the view
            ViewBag.UserName = userName;
            ViewBag.UserEmail = userEmail;           

            return View("~/Views/AdvisorViews/Home/EmployeeLanding.cshtml");
        }
    }
}